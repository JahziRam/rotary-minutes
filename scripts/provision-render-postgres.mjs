#!/usr/bin/env node
/**
 * Provisionne Render Postgres + lie DATABASE_URL/DIRECT_URL au web service + redeploy.
 * Remplace les credentials Prisma morts sans passer par le dashboard.
 *
 * Usage:
 *   $env:RENDER_API_KEY = "rnd_..."
 *   node scripts/provision-render-postgres.mjs
 */
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_NAME = "rotary-minutes";
const DB_NAME = "rotary-minutes-db";
const REGION = "oregon";
const HEALTH_URL = "https://clubminutes.api.mg/api/health?deep=1";

const key = process.env.RENDER_API_KEY;
if (!key) {
  console.error("Set RENDER_API_KEY: https://dashboard.render.com/u/settings#api-keys");
  process.exit(1);
}

const { api, getOwnerId, findService, upsertEnvVar, triggerDeploy } = createRenderApi(key);

async function findPostgres(ownerId) {
  const list = await api(`/postgres?ownerId=${ownerId}&limit=50`);
  for (const row of list || []) {
    const db = row.postgres || row;
    if (db.name === DB_NAME) return db;
  }
  return null;
}

async function createPostgres(ownerId) {
  console.log(`Creating Postgres "${DB_NAME}" (${REGION}, free)...`);
  const created = await api("/postgres", {
    method: "POST",
    body: JSON.stringify({
      name: DB_NAME,
      plan: "free",
      region: REGION,
      ownerId,
      databaseName: "rotary_minutes",
      databaseUser: "rotary_minutes",
      version: "16",
    }),
  });
  return created.postgres || created;
}

async function waitForPostgres(id, maxMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const db = await api(`/postgres/${id}`);
    const p = db.postgres || db;
    console.log(`  Postgres status: ${p.status}`);
    if (p.status === "available") return p;
    if (p.status === "unavailable") throw new Error("Postgres provisioning failed");
    await sleep(10_000);
  }
  throw new Error("Timeout waiting for Postgres");
}

function ensureSslConnectionString(url) {
  if (!url) return url;
  if (/sslmode=|ssl=true/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

async function getConnectionString(postgresId) {
  const info = await api(`/postgres/${postgresId}/connection-info`);
  const conn = info.connectionInfo || info;
  // Free web services must use external URL + SSL (private network is paid-only).
  const raw = conn.externalConnectionString || conn.connectionString;
  if (!raw) throw new Error("No connection string in Render response");
  return ensureSslConnectionString(raw);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(120_000) });
      const body = await res.json();
      console.log(`  Health: ${JSON.stringify(body)}`);
      if (body.database === "ok") return body;
    } catch (e) {
      console.log(`  Health check pending: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(20_000);
  }
  throw new Error("Timeout waiting for healthy database");
}

const ownerId = await getOwnerId();
console.log(`Workspace: ${ownerId}`);

let postgres = await findPostgres(ownerId);
if (!postgres) {
  postgres = await createPostgres(ownerId);
}

if (postgres.status !== "available") {
  postgres = await waitForPostgres(postgres.id);
}

console.log(`Postgres ready: ${postgres.name} (${postgres.id})`);

const connectionString = await getConnectionString(postgres.id);
const host = (() => {
  try {
    return new URL(connectionString.replace(/^postgres:/, "http:")).hostname;
  } catch {
    return "unknown";
  }
})();
console.log(`Connection host: ${host}`);

const service = await findService(ownerId, SERVICE_NAME);
if (!service) {
  console.error(`Web service "${SERVICE_NAME}" not found.`);
  process.exit(1);
}
console.log(`Web service: ${service.name} (${service.id})`);

await upsertEnvVar(service.id, "DATABASE_URL", connectionString);
await upsertEnvVar(service.id, "DIRECT_URL", connectionString);
await upsertEnvVar(service.id, "RUN_DB_SEED", "1");
console.log("Env vars updated (DATABASE_URL, DIRECT_URL, RUN_DB_SEED)");

await triggerDeploy(service.id);
console.log("Deploy triggered — waiting for database health...");

const health = await waitForHealth();
console.log("\n=== SUCCESS ===");
console.log(JSON.stringify(health, null, 2));