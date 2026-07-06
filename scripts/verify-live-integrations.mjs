#!/usr/bin/env node
/**
 * Vérifie les intégrations en production (auth, emails, Stripe, status).
 *
 * Usage: node scripts/verify-live-integrations.mjs
 */
const BASE = (process.env.BASE_URL ?? "https://clubminutes.api.mg").replace(/\/$/, "");

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

let failed = 0;

const providers = await get("/api/auth/providers");
log("auth", `providers → ${providers.status}`);
if (providers.status !== 200) {
  console.log(providers.text.slice(0, 200));
  failed++;
}

const status = await get("/fr/status");
log("status", `page → ${status.status}`);
if (status.status !== 200) failed++;

const en = await get("/en");
log("landing", `en → ${en.status}`);
if (en.status !== 200) failed++;

const demo = await get("/fr/demo");
log("demo", `→ ${demo.status}`);
if (demo.status !== 200) failed++;

console.log("\n--- Manual checks (dashboard) ---");
console.log("1. Settings → Subscription → Stripe checkout opens");
console.log("2. Finalized minute → Send email with PDF + clubminutes.api.mg verify link");
console.log("3. /fr/status → Resend + Stripe green");

if (failed > 0) {
  console.error(`\nFAIL: ${failed} check(s)`);
  process.exit(1);
}
console.log("\nPASS: live endpoints reachable");