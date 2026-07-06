#!/usr/bin/env node
/**
 * Audit admin pages — requires super-admin session cookie or tests unauthenticated redirects.
 *
 * Usage:
 *   node scripts/audit-admin.mjs
 *   BASE=https://clubminutes.api.mg node scripts/audit-admin.mjs
 *   BASE=http://localhost:3000 node scripts/audit-admin.mjs
 */
import "dotenv/config";

const BASE = process.env.BASE ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const LOCALE = process.env.LOCALE ?? "fr";
const EMAIL = process.env.SUPER_EMAIL ?? "superadmin@rotaryminutes.app";
const PASS = process.env.SUPER_PASS ?? "RotaryAdmin2026!";

const ADMIN_ROUTES = [
  "/admin",
  "/admin/clubs",
  "/admin/users",
  "/admin/subscriptions",
  "/admin/roles",
  "/admin/announcements",
  "/admin/support",
  "/admin/feature-flags",
  "/admin/settings",
  "/admin/export",
];

const API_ROUTES = ["/api/admin/export-pdf", "/api/health?deep=1"];

function pass(name, detail = "") {
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
  return true;
}
function fail(name, detail = "") {
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
  return false;
}

async function getCsrfToken() {
  const res = await fetch(`${BASE}/api/auth/csrf`);
  if (!res.ok) throw new Error(`CSRF HTTP ${res.status}`);
  const data = await res.json();
  return data.csrfToken;
}

class CookieJar {
  #map = new Map();

  ingest(res) {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq < 1) continue;
      this.#map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header() {
    return [...this.#map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function login() {
  const jar = new CookieJar();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  jar.ingest(csrfRes);
  const { csrfToken } = await csrfRes.json();

  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASS,
    callbackUrl: `${BASE}/${LOCALE}/admin`,
    json: "true",
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.header(),
    },
    body,
    redirect: "manual",
  });
  jar.ingest(res);

  if ([302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location");
    if (loc) {
      const follow = await fetch(loc.startsWith("http") ? loc : `${BASE}${loc}`, {
        headers: { Cookie: jar.header() },
        redirect: "manual",
      });
      jar.ingest(follow);
    }
  }

  const cookie = jar.header();
  if (!cookie) throw new Error(`Login failed HTTP ${res.status}: no cookies`);

  const sessionCheck = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  jar.ingest(sessionCheck);
  const session = await sessionCheck.json();
  if (!session?.user?.isSuperAdmin) {
    throw new Error(`Not super-admin (${session?.user?.email ?? "no user"})`);
  }
  return jar.header();
}

function hasErrorSignals(html) {
  const lower = html.toLowerCase();
  if (html.length < 500) return "page too short (blank?)";
  if (lower.includes("application error") || lower.includes("internal server error")) {
    return "error page detected";
  }
  if (lower.includes("erreur dans l'administration")) return "admin error boundary";
  if (!lower.includes("super admin") && !lower.includes("vue d'ensemble") && !lower.includes("utilisateurs")) {
    // might still be valid for some pages
  }
  return null;
}

async function auditPage(path, cookie) {
  const url = `${BASE}/${LOCALE}${path}`;
  const res = await fetch(url, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });

  if ([301, 302, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location") ?? "";
    if (loc.includes("/login") || loc.includes("/dashboard")) {
      return fail(path, `redirect ${res.status} → ${loc}`);
    }
    return fail(path, `unexpected redirect ${res.status} → ${loc}`);
  }

  if (!res.ok) {
    return fail(path, `HTTP ${res.status}`);
  }

  const html = await res.text();
  const signal = hasErrorSignals(html);
  if (signal) return fail(path, signal);

  const titleHints = [
    "Vue d'ensemble",
    "Clubs",
    "Utilisateurs",
    "Abonnements",
    "Rôles",
    "Annonces",
    "Support",
    "Feature flags",
    "Paramètres",
    "Export",
  ];
  const hasContent = titleHints.some((h) => html.includes(h)) || html.includes("Super Admin");
  if (!hasContent) return fail(path, "missing expected admin content");
  return pass(path, `${html.length} bytes`);
}

async function auditApi(path, cookie) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  if (path.includes("export-pdf")) {
    if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
      return pass(path, `PDF ${res.headers.get("content-length") ?? "?"} bytes`);
    }
    return fail(path, `HTTP ${res.status} ${res.headers.get("content-type")}`);
  }
  if (res.ok) return pass(path, `HTTP ${res.status}`);
  return fail(path, `HTTP ${res.status}`);
}

async function main() {
  console.log(`\n🔍 Admin audit — ${BASE}/${LOCALE}\n`);

  let cookie = "";
  try {
    cookie = await login();
    pass("Auth: super-admin login", EMAIL);
  } catch (e) {
    fail("Auth: super-admin login", e.message);
    console.log("\nContinuing without session (expect redirects)...\n");
  }

  let ok = 0;
  let total = 0;
  for (const route of ADMIN_ROUTES) {
    total++;
    if (await auditPage(route, cookie)) ok++;
  }
  for (const route of API_ROUTES) {
    total++;
    if (await auditApi(route, cookie)) ok++;
  }

  console.log(`\n📊 ${ok}/${total} checks passed\n`);
  process.exit(ok === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});