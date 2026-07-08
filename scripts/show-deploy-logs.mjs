#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
const { api } = createRenderApi(key);
const deps = await api("/services/srv-d95nar28qa3s738v99j0/deploys?limit=1");
const d = (deps[0]?.deploy || deps[0]);
console.log("Deploy:", d.id, d.status);
const logs = await api(`/services/srv-d95nar28qa3s738v99j0/deploys/${d.id}/logs?limit=100`);
for (const row of logs || []) {
  const line = row.message || row;
  if (typeof line === "string" && (line.includes("Prisma") || line.includes("error") || line.includes(">>>") || line.includes("Build"))) {
    console.log(line);
  }
}