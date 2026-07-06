#!/usr/bin/env node
/**
 * Corrige les variables NextAuth sur Render (UntrustedHost / MissingSecret).
 *
 * Usage:
 *   $env:RENDER_API_KEY = "rnd_..."
 *   node scripts/fix-render-auth-env.mjs
 */
import { randomBytes } from "node:crypto";

const API = "https://api.render.com/v1";
const SERVICE_NAME = "rotary-minutes";
const APP_URL = "https://clubminutes.api.mg";

const key = process.env.RENDER_API_KEY;
if (!key) {
  console.error("Set RENDER_API_KEY (https://dashboard.render.com/u/settings#api-keys)");
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getOwnerId() {
  const owners = await api("/owners?limit=20");
  const entry = owners?.[0]?.owner || owners?.[0];
  const id = entry?.id || entry?.owner?.id;
  if (!id) throw new Error("No Render workspace found on this API key.");
  return id;
}

async function findService(ownerId) {
  const list = await api(`/services?ownerId=${ownerId}&limit=50`);
  for (const row of list || []) {
    const s = row.service || row;
    if (s.name === SERVICE_NAME) return s;
  }
  return null;
}

async function getEnvVars(serviceId) {
  const rows = await api(`/services/${serviceId}/env-vars`);
  const map = {};
  for (const row of rows || []) {
    const v = row.envVar || row;
    map[v.key] = v.value ?? "";
  }
  return map;
}

async function setEnvVars(serviceId, env) {
  await api(`/services/${serviceId}/env-vars`, {
    method: "PUT",
    body: JSON.stringify(
      Object.entries(env).map(([key, value]) => ({ key, value }))
    ),
  });
}

async function triggerDeploy(serviceId) {
  return api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
}

const ownerId = await getOwnerId();
const service = await findService(ownerId);
if (!service) {
  console.error(`Service "${SERVICE_NAME}" not found.`);
  process.exit(1);
}

console.log(`Service: ${service.name} (${service.id})`);

const current = await getEnvVars(service.id);
const secret =
  current.AUTH_SECRET?.trim() ||
  current.NEXTAUTH_SECRET?.trim() ||
  randomBytes(32).toString("base64");

const patch = {
  ...current,
  AUTH_SECRET: secret,
  AUTH_URL: APP_URL,
  AUTH_TRUST_HOST: "true",
  NEXTAUTH_URL: APP_URL,
  NEXT_PUBLIC_APP_URL: APP_URL,
};

console.log("Updating auth env vars:");
console.log(`  AUTH_SECRET: ${current.AUTH_SECRET ? "kept existing" : "generated new"}`);
console.log(`  AUTH_URL: ${APP_URL}`);
console.log(`  AUTH_TRUST_HOST: true`);
console.log(`  NEXTAUTH_URL: ${APP_URL}`);

await setEnvVars(service.id, patch);
await triggerDeploy(service.id);

console.log("\nDeploy triggered. After ~2-5 min, verify:");
console.log(`  curl -s https://clubminutes.api.mg/api/auth/providers`);