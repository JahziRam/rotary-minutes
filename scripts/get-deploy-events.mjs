#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const DEPLOY_ID = process.argv[2];

const key = process.env.RENDER_API_KEY;
if (!key || !DEPLOY_ID) process.exit(1);

const { api } = createRenderApi(key);
const events = await api(`/services/${SERVICE_ID}/deploys/${DEPLOY_ID}/events?limit=50`);
for (const row of events || []) {
  const e = row.event || row;
  const msg = e.message || e.details || JSON.stringify(e);
  if (typeof msg === "string") console.log(msg);
  else console.log(JSON.stringify(msg));
}