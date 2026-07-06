#!/usr/bin/env node
/**
 * Corrige les variables NextAuth sur Render (UntrustedHost / MissingSecret).
 * Met à jour uniquement les clés auth — ne touche pas DATABASE_URL ni les autres secrets.
 *
 * Usage:
 *   $env:RENDER_API_KEY = "rnd_..."
 *   node scripts/fix-render-auth-env.mjs
 */
import { randomBytes } from "node:crypto";
import { createRenderApi } from "./render-env-api.mjs";

const SERVICE_NAME = "rotary-minutes";
const APP_URL = "https://clubminutes.api.mg";

const key = process.env.RENDER_API_KEY;
if (!key) {
  console.error("Set RENDER_API_KEY (https://dashboard.render.com/u/settings#api-keys)");
  process.exit(1);
}

const { api, getOwnerId, findService, upsertEnvVar, triggerDeploy } = createRenderApi(key);

async function getEnvVar(serviceId, name) {
  const rows = await api(`/services/${serviceId}/env-vars`);
  for (const row of rows || []) {
    const v = row.envVar || row;
    if (v.key === name) return v.value ?? "";
  }
  return "";
}

const ownerId = await getOwnerId();
const service = await findService(ownerId, SERVICE_NAME);
if (!service) {
  console.error(`Service "${SERVICE_NAME}" not found.`);
  process.exit(1);
}

console.log(`Service: ${service.name} (${service.id})`);

const existingSecret =
  (await getEnvVar(service.id, "AUTH_SECRET"))?.trim() ||
  (await getEnvVar(service.id, "NEXTAUTH_SECRET"))?.trim() ||
  randomBytes(32).toString("base64");

const updates = {
  AUTH_SECRET: existingSecret,
  AUTH_URL: APP_URL,
  AUTH_TRUST_HOST: "true",
  NEXTAUTH_URL: APP_URL,
  NEXT_PUBLIC_APP_URL: APP_URL,
};

console.log("Updating auth env vars (single-key updates only):");
for (const [k, v] of Object.entries(updates)) {
  console.log(`  ${k}`);
  await upsertEnvVar(service.id, k, v);
}

await triggerDeploy(service.id);

console.log("\nDeploy triggered. After ~2-5 min, verify:");
console.log(`  curl -s https://clubminutes.api.mg/api/auth/providers`);