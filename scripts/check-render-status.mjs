#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_ID = "srv-d95nar28qa3s738v99j0";
const key = process.env.RENDER_API_KEY;
if (!key) {
  console.error("RENDER_API_KEY required");
  process.exit(1);
}

const { api } = createRenderApi(key);
const rows = await api(`/services/${SERVICE_ID}/env-vars`);
for (const row of rows) {
  const v = row.envVar || row;
  if (v.key === "DATABASE_URL" || v.key === "DIRECT_URL") {
    console.log(`${v.key}: sslmode=${v.value?.includes("sslmode")} host=${v.value?.split("@")[1]?.split("/")[0]}`);
  }
}
const dep = await api(`/services/${SERVICE_ID}/deploys?limit=5`);
for (const row of dep) {
  const d = row.deploy || row;
  console.log(`deploy ${d.id} ${d.status} ${d.createdAt}`);
}