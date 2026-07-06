#!/usr/bin/env node
/**
 * Déploie Rotary Minutes sur Render via API.
 * Prérequis: GitHub connecté dans Render (Git deployment credentials).
 *
 * Usage:
 *   set RENDER_API_KEY=rnd_xxx
 *   node scripts/setup-render.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const API = "https://api.render.com/v1";
const REPO = "https://github.com/JahziRam/rotary-minutes";
const SERVICE_NAME = "rotary-minutes";
const CUSTOM_DOMAIN = "clubminutes.api.mg";

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
  console.log(`Workspace: ${entry?.name || entry?.owner?.name || id}`);
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

async function createService(ownerId, env) {
  console.log("Creating web service…");
  const payload = {
    type: "web_service",
    name: SERVICE_NAME,
    ownerId,
    repo: REPO,
    branch: "main",
    autoDeploy: "yes",
    serviceDetails: {
      env: "node",
      plan: "free",
      region: "frankfurt",
      numInstances: 1,
      healthCheckPath: "/en",
      envSpecificDetails: {
        buildCommand: "npm ci && npx prisma generate && npm run build",
        startCommand: "npm run start",
      },
    },
    envVars: Object.entries(env).map(([key, value]) => ({ key, value })),
  };
  const created = await api("/services", { method: "POST", body: JSON.stringify(payload) });
  return created.service || created;
}

async function setEnvVars(serviceId, env) {
  console.log("Updating environment variables…");
  await api(`/services/${serviceId}/env-vars`, {
    method: "PUT",
    body: JSON.stringify(
      Object.entries(env).map(([key, value]) => ({ key, value }))
    ),
  });
}

async function addCustomDomain(serviceId) {
  console.log(`Adding custom domain ${CUSTOM_DOMAIN}…`);
  try {
    await api(`/services/${serviceId}/custom-domains`, {
      method: "POST",
      body: JSON.stringify({ name: CUSTOM_DOMAIN }),
    });
  } catch (e) {
    if (String(e).includes("409") || String(e).includes("already")) {
      console.log("Custom domain already exists.");
      return;
    }
    throw e;
  }
}

async function triggerDeploy(serviceId) {
  console.log("Triggering deploy…");
  const d = await api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
  return d;
}

const dotenv = loadDotEnv();
const env = {
  NODE_ENV: "production",
  DATABASE_URL: dotenv.DATABASE_URL || process.env.DATABASE_URL || "",
  AUTH_SECRET: dotenv.AUTH_SECRET?.includes("dev-secret")
    ? randomBytes(32).toString("base64")
    : dotenv.AUTH_SECRET || randomBytes(32).toString("base64"),
  CRON_SECRET: dotenv.CRON_SECRET || randomBytes(32).toString("base64"),
  NEXTAUTH_URL: `https://${CUSTOM_DOMAIN}`,
  NEXT_PUBLIC_APP_URL: `https://${CUSTOM_DOMAIN}`,
  NEXT_PUBLIC_APP_NAME: "Rotary Minutes",
  REFERRAL_REWARD_DAYS: "30",
};

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL missing in .env or environment.");
  process.exit(1);
}

const ownerId = await getOwnerId();
let service = await findService(ownerId);

if (!service) {
  service = await createService(ownerId, env);
  console.log(`Created: ${service.dashboardUrl || service.id}`);
} else {
  console.log(`Found: ${service.dashboardUrl || service.id}`);
  await setEnvVars(service.id, env);
}

await addCustomDomain(service.id);
await triggerDeploy(service.id);

const host = service.slug ? `${service.slug}.onrender.com` : `${SERVICE_NAME}.onrender.com`;
console.log("\n=== Next: DNS Cloudflare (zone api.mg) ===");
console.log(`CNAME clubminutes -> ${host}  (proxy: DNS only / grey)`);
console.log(`Or: CLOUDFLARE_API_TOKEN=xxx RENDER_HOST=${host} bash scripts/cloudflare-dns-render.sh`);
console.log("\nThen remove Worker route on clubminutes.api.mg if still active.");