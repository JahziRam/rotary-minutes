#!/usr/bin/env node
/**
 * Test live super-admin login against production (or BASE_URL).
 *
 * Usage:
 *   node scripts/test-live-login.mjs
 *   BASE_URL=https://clubminutes.api.mg node scripts/test-live-login.mjs
 */
const BASE_URL = (process.env.BASE_URL ?? "https://clubminutes.api.mg").replace(/\/$/, "");
const EMAIL = process.env.TEST_EMAIL ?? "superadmin@rotaryminutes.app";
const PASSWORD = process.env.TEST_PASSWORD ?? "RotaryAdmin2026!";

function log(step, detail) {
  console.log(`[${step}] ${detail}`);
}

async function request(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { redirect: "manual", ...opts });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { url, res, text, json };
}

function getCookies(res, jar) {
  const getSetCookie = res.headers.getSetCookie?.bind(res.headers);
  const raw = getSetCookie ? getSetCookie() : [];
  if (raw.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) raw.push(single);
  }
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

const jar = new Map();

log("1", `BASE_URL=${BASE_URL}`);
log("1", `EMAIL=${EMAIL}`);

const providers = await request("/api/auth/providers");
log("providers", `status=${providers.res.status}`);
if (providers.res.status !== 200) {
  console.log(providers.text.slice(0, 300));
  console.error("\nFAIL: auth providers endpoint broken — login cannot work.");
  process.exit(1);
}
console.log(JSON.stringify(providers.json, null, 2));

const csrf = await request("/api/auth/csrf", {
  headers: { cookie: cookieHeader(jar) },
});
getCookies(csrf.res, jar);
log("csrf", `status=${csrf.res.status} token=${csrf.json?.csrfToken ? "ok" : "missing"}`);
if (!csrf.json?.csrfToken) {
  console.error("\nFAIL: no CSRF token.");
  process.exit(1);
}

const body = new URLSearchParams({
  csrfToken: csrf.json.csrfToken,
  email: EMAIL,
  password: PASSWORD,
  callbackUrl: `${BASE_URL}/fr/admin`,
  json: "true",
});

const login = await request("/api/auth/callback/credentials", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    cookie: cookieHeader(jar),
  },
  body,
});
getCookies(login.res, jar);
log("login", `status=${login.res.status} location=${login.res.headers.get("location") ?? "none"}`);
if (login.text) console.log(login.text.slice(0, 400));

const session = await request("/api/auth/session", {
  headers: { cookie: cookieHeader(jar) },
});
log("session", `status=${session.res.status}`);
console.log(JSON.stringify(session.json, null, 2));

const admin = await request("/fr/admin", {
  headers: { cookie: cookieHeader(jar) },
});
log("admin", `status=${admin.res.status} location=${admin.res.headers.get("location") ?? "none"}`);

if (session.json?.user?.isSuperAdmin && (admin.res.status === 200 || admin.res.status === 307)) {
  console.log("\nPASS: super admin session established.");
  process.exit(0);
}

console.error("\nFAIL: super admin login did not succeed.");
process.exit(1);