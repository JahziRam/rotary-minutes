#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const POSTGRES_ID = "dpg-d95viunaqgkc73ek09pg-a";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api, upsertEnvVar, triggerDeploy } = createRenderApi(key);

const [info, dbRes] = await Promise.all([
  api(`/postgres/${POSTGRES_ID}/connection-info`),
  api(`/postgres/${POSTGRES_ID}`),
]);
const c = info.connectionInfo || info;
const p = dbRes.postgres || dbRes;

const password = c.password;
const user = p.databaseUser;
const name = p.databaseName;
const internalHost =
  c.internalConnectionString?.split("@")[1]?.split("/")[0] || `${POSTGRES_ID}:5432`;

const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${internalHost}/${name}`;

console.log("Internal host:", internalHost);
await upsertEnvVar(SERVICE_ID, "DATABASE_URL", url);
await upsertEnvVar(SERVICE_ID, "DIRECT_URL", url);
await upsertEnvVar(SERVICE_ID, "RUN_DB_SEED", "1");
await triggerDeploy(SERVICE_ID);
console.log("Deploy triggered (encoded internal URL)");