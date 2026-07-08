#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api, getOwnerId } = createRenderApi(key);
const ownerId = await getOwnerId();
const rows = await api(`/blueprints?ownerId=${ownerId}&limit=20`);
let blueprint;
for (const row of rows || []) {
  const b = row.blueprint || row;
  if (b.repo?.includes("rotary-minutes") || b.name?.includes("rotary")) {
    blueprint = b;
    break;
  }
}
if (!blueprint && rows?.[0]) blueprint = (rows[0].blueprint || rows[0]);
if (!blueprint) {
  console.error("No blueprint found — create via Dashboard → Blueprint");
  process.exit(1);
}
console.log("Blueprint:", blueprint.id, blueprint.name, blueprint.status);
try {
  const sync = await api(`/blueprints/${blueprint.id}/syncs`, { method: "POST", body: "{}" });
  console.log("Sync started:", JSON.stringify(sync));
} catch (e) {
  console.error("Sync failed:", e.message);
}