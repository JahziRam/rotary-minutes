#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const POSTGRES_ID = "dpg-d95viunaqgkc73ek09pg-a";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api, upsertEnvVar, triggerDeploy } = createRenderApi(key);

const info = await api(`/postgres/${POSTGRES_ID}/connection-info`);
const conn = info.connectionInfo || info;
let internal = conn.internalConnectionString;
if (!internal) throw new Error("No internal connection string");

// Ensure port for drivers that require it
if (!/:\d+\//.test(internal.split("@")[1] || "")) {
  internal = internal.replace(/@([^/]+)\//, "@$1:5432/");
}

console.log("Internal host:", internal.split("@")[1]?.split("/")[0]);
await upsertEnvVar(SERVICE_ID, "DATABASE_URL", internal);
await upsertEnvVar(SERVICE_ID, "DIRECT_URL", internal);
await upsertEnvVar(SERVICE_ID, "RUN_DB_SEED", "1");
await triggerDeploy(SERVICE_ID);
console.log("Deploy triggered (internal private network URL)");