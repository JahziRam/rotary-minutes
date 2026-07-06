#!/usr/bin/env node
/**
 * Recreate free Postgres in Oregon (matches web service region) + internal URL.
 * Deletes the Frankfurt DB first (workspace allows only one free Postgres).
 */
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const OLD_POSTGRES_ID = "dpg-d95viunaqgkc73ek09pg-a";
const DB_NAME = "rotary-minutes-db";
const REGION = "oregon";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api, getOwnerId, upsertEnvVar, triggerDeploy } = createRenderApi(key);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPostgres(id, maxMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const db = await api(`/postgres/${id}`);
    const p = db.postgres || db;
    console.log(`  Postgres status: ${p.status} (${p.region})`);
    if (p.status === "available") return p;
    if (p.status === "unavailable") throw new Error("Postgres provisioning failed");
    await sleep(10_000);
  }
  throw new Error("Timeout waiting for Postgres");
}

const ownerId = await getOwnerId();

console.log(`Deleting Frankfurt Postgres ${OLD_POSTGRES_ID}...`);
try {
  await api(`/postgres/${OLD_POSTGRES_ID}`, { method: "DELETE" });
  console.log("Deleted.");
} catch (e) {
  console.log("Delete skipped or failed:", e.message);
}

console.log(`Creating Postgres "${DB_NAME}" in ${REGION}...`);
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
const postgres = created.postgres || created;
const ready = await waitForPostgres(postgres.id);

const info = await api(`/postgres/${ready.id}/connection-info`);
const conn = info.connectionInfo || info;
let internal = conn.internalConnectionString;
if (!/:\d+\//.test(internal.split("@")[1] || "")) {
  internal = internal.replace(/@([^/]+)\//, "@$1:5432/");
}

console.log("Internal host:", internal.split("@")[1]?.split("/")[0]);
await upsertEnvVar(SERVICE_ID, "DATABASE_URL", internal);
await upsertEnvVar(SERVICE_ID, "DIRECT_URL", internal);
await upsertEnvVar(SERVICE_ID, "RUN_DB_SEED", "1");
await triggerDeploy(SERVICE_ID);
console.log("Deploy triggered (Oregon internal DB)");