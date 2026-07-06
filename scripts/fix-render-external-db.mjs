#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const POSTGRES_ID = "dpg-d95viunaqgkc73ek09pg-a";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api, upsertEnvVar, triggerDeploy } = createRenderApi(key);

function ensureSsl(url) {
  if (/sslmode=|ssl=true/i.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
}

const info = await api(`/postgres/${POSTGRES_ID}/connection-info`);
const conn = info.connectionInfo || info;
// Base URL without sslmode — prisma.ts adds SSL for *.render.com hosts
const external = conn.externalConnectionString.split("?")[0];
console.log("External host:", external.split("@")[1]?.split("/")[0]);
await upsertEnvVar(SERVICE_ID, "DATABASE_URL", external);
await upsertEnvVar(SERVICE_ID, "DIRECT_URL", external);
await upsertEnvVar(SERVICE_ID, "RUN_DB_SEED", "1");
await triggerDeploy(SERVICE_ID);
console.log("Deploy triggered (external + SSL)");