#!/usr/bin/env node
/**
 * Sync Prisma Postgres URLs to Render (DATABASE_URL pooled + DIRECT_URL direct).
 *
 * 1. Regenerate both strings in Prisma Console → Connect → Generate new connection string
 * 2. Paste into .env (at least one; the other is derived from hostname swap)
 * 3. Run:
 *      $env:RENDER_API_KEY = "rnd_..."
 *      node scripts/fix-render-db-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const API = "https://api.render.com/v1";
const SERVICE_NAME = "rotary-minutes";

const key = process.env.RENDER_API_KEY;
if (!key) {
  console.error("Set RENDER_API_KEY (https://dashboard.render.com/u/settings#api-keys)");
  process.exit(1);
}

function loadDotEnv() {
  const path = resolve(ROOT, ".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

function hostOf(url) {
  try {
    const n = url.replace(/^prisma\+postgres:\/\//, "postgresql://");
    return new URL(n).hostname;
  } catch {
    return null;
  }
}

function swapHost(url, from, to) {
  return url.includes(from) ? url.replace(from, to) : url;
}

function resolveDbUrls(dotenv) {
  let databaseUrl = (dotenv.DATABASE_URL || process.env.DATABASE_URL || "").trim();
  let directUrl = (dotenv.DIRECT_URL || process.env.DIRECT_URL || "").trim();

  if (!databaseUrl && !directUrl) {
    throw new Error("Set DATABASE_URL and/or DIRECT_URL in .env first.");
  }

  if (databaseUrl && !directUrl) {
    directUrl = swapHost(databaseUrl, "pooled.db.prisma.io", "db.prisma.io");
    if (hostOf(directUrl) !== "db.prisma.io") {
      directUrl = swapHost(databaseUrl, "pooled.db.prisma.io", "db.prisma.io");
    }
  }
  if (directUrl && !databaseUrl) {
    databaseUrl = swapHost(directUrl, "db.prisma.io", "pooled.db.prisma.io");
  }

  const pooledHost = hostOf(databaseUrl);
  const directHost = hostOf(directUrl);

  if (pooledHost !== "pooled.db.prisma.io") {
    console.warn(
      `WARNING: DATABASE_URL host is "${pooledHost}" — expected pooled.db.prisma.io for runtime`
    );
  }
  if (directHost !== "db.prisma.io") {
    console.warn(`WARNING: DIRECT_URL host is "${directHost}" — expected db.prisma.io for CLI/build`);
  }

  return { databaseUrl, directUrl };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getOwnerId() {
  const owners = await api("/owners?limit=20");
  const entry = owners?.[0]?.owner || owners?.[0];
  const id = entry?.id || entry?.owner?.id;
  if (!id) throw new Error("No Render workspace found on this API key.");
  return id;
}

async function findService(ownerId) {
  const list = await api(`/services?ownerId=${ownerId}&limit=50`);
  for (const row of list || []) {
    const s = row.service || row;
    if (s.name === SERVICE_NAME) return s;
  }
  return null;
}

async function getEnvVars(serviceId) {
  const rows = await api(`/services/${serviceId}/env-vars`);
  const map = {};
  for (const row of rows || []) {
    const v = row.envVar || row;
    map[v.key] = v.value ?? "";
  }
  return map;
}

async function setEnvVars(serviceId, env) {
  await api(`/services/${serviceId}/env-vars`, {
    method: "PUT",
    body: JSON.stringify(
      Object.entries(env).map(([key, value]) => ({ key, value }))
    ),
  });
}

async function triggerDeploy(serviceId) {
  return api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
}

async function testConnection(connectionString) {
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: connectionString.replace(/^prisma\+postgres:\/\//, "postgresql://"),
    connectionTimeoutMillis: 15_000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

const dotenv = loadDotEnv();
const { databaseUrl, directUrl } = resolveDbUrls(dotenv);

console.log("Testing direct connection (DIRECT_URL)…");
try {
  await testConnection(directUrl);
  console.log("  OK — credentials valid");
} catch (e) {
  console.error("  FAILED — regenerate strings in Prisma Console before syncing to Render:");
  console.error("  https://console.prisma.io → your database → Connect → Generate new connection string");
  console.error(`  ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

const ownerId = await getOwnerId();
const service = await findService(ownerId);
if (!service) {
  console.error(`Service "${SERVICE_NAME}" not found.`);
  process.exit(1);
}

console.log(`Service: ${service.name} (${service.id})`);

const current = await getEnvVars(service.id);
const patch = {
  ...current,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
};

console.log("Updating Render env:");
console.log(`  DATABASE_URL → ${hostOf(databaseUrl)}`);
console.log(`  DIRECT_URL   → ${hostOf(directUrl)}`);

await setEnvVars(service.id, patch);
await triggerDeploy(service.id);

console.log("\nDeploy triggered. After ~2-5 min, verify:");
console.log("  curl \"https://clubminutes.api.mg/api/health?deep=1\"");
console.log('  Expected: {"ok":true,"database":"ok",...}');