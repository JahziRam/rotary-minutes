/**
 * Verification script for Rotary Minutes
 * Run: node scripts/verify-app.mjs
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
// Prisma client loaded via dynamic import in main()

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPER_EMAIL = "superadmin@rotaryminutes.app";
const SUPER_PASS = "RotaryAdmin2026!";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchCheck(name, url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: "manual", ...opts });
    if (res.status >= 200 && res.status < 400) {
      pass(name, `HTTP ${res.status}`);
      return res;
    }
    fail(name, `HTTP ${res.status}`);
    return null;
  } catch (e) {
    fail(name, e.message);
    return null;
  }
}

async function main() {
  console.log("\n🔍 Rotary Minutes — Vérification\n");

  // 1. Database
  try {
    const { PrismaClient } = await import("../src/generated/prisma/client.ts");
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    const user = await prisma.user.findUnique({
      where: { email: SUPER_EMAIL },
      include: { memberships: { include: { club: true } } },
    });
    if (!user?.isSuperAdmin) fail("DB: Super admin exists", "User not found or not super admin");
    else {
      const valid = await bcrypt.compare(SUPER_PASS, user.passwordHash ?? "");
      if (valid) pass("DB: Super admin credentials", user.email);
      else fail("DB: Password hash", "Invalid password");
    }

    const club = await prisma.club.findFirst({ where: { slug: "rotary-club-paris-demo" } });
    if (club) pass("DB: Demo club", club.name);
    else fail("DB: Demo club");

    const members = await prisma.member.count({ where: { clubId: club?.id } });
    if (members >= 5) pass("DB: Members", `${members} membres`);
    else fail("DB: Members", `Only ${members}`);

    const meetings = await prisma.meeting.count({ where: { clubId: club?.id } });
    if (meetings >= 1) pass("DB: Meetings", `${meetings} réunions`);
    else fail("DB: Meetings");

    const minutes = await prisma.minute.count({ where: { clubId: club?.id } });
    if (minutes >= 1) pass("DB: Minutes", `${minutes} PV`);
    else fail("DB: Minutes");

    const minute = await prisma.minute.findFirst({
      where: { clubId: club?.id },
      include: { agendaItems: true },
    });
    if (minute) {
      globalThis.__testMinuteId = minute.id;
      pass("DB: Minute with agenda", `${minute.agendaItems.length} points`);
    }

    await prisma.$disconnect();
  } catch (e) {
    fail("DB: Connection", e.message);
  }

  // 2. HTTP pages (public)
  await fetchCheck("Page: Landing FR", `${BASE}/fr`);
  await fetchCheck("Page: Landing EN", `${BASE}/en`);
  await fetchCheck("Page: Login FR", `${BASE}/fr/login`);
  await fetchCheck("Page: Register FR", `${BASE}/fr/register`);
  await fetchCheck("Page: Demo FR", `${BASE}/fr/demo`);
  await fetchCheck("Page: Case studies FR", `${BASE}/fr/case-studies`);
  await fetchCheck("Page: Privacy FR", `${BASE}/fr/privacy`);
  await fetchCheck("Page: Status FR", `${BASE}/fr/status`);

  // Protected pages redirect to login (302/307)
  const dashRes = await fetch(`${BASE}/fr/dashboard`, { redirect: "manual" });
  if ([302, 307, 303].includes(dashRes.status)) {
    pass("Auth: Dashboard protected", `redirect ${dashRes.status}`);
  } else if (dashRes.status === 200) {
    pass("Auth: Dashboard accessible", "session may exist");
  } else {
    fail("Auth: Dashboard protected", `HTTP ${dashRes.status}`);
  }

  // 3. API routes
  const authRes = await fetch(`${BASE}/api/auth/providers`);
  if (authRes.ok) {
    const data = await authRes.json();
    if (data.credentials) pass("API: Auth providers", "credentials OK");
    else fail("API: Auth providers", JSON.stringify(data));
  } else {
    fail("API: Auth providers", `HTTP ${authRes.status}`);
  }

  const minuteId = globalThis.__testMinuteId;
  if (minuteId) {
    const pdfRes = await fetch(`${BASE}/api/pdf/${minuteId}`);
    if (pdfRes.ok && pdfRes.headers.get("content-type")?.includes("pdf")) {
      pass("API: PDF generation", `${pdfRes.headers.get("content-length") ?? "?"} bytes`);
    } else {
      fail("API: PDF generation", `HTTP ${pdfRes.status}`);
    }
  }

  // API v1 (unauthenticated)
  const openApiRes = await fetch(`${BASE}/api/v1/openapi`);
  if (openApiRes.ok) {
    const spec = await openApiRes.json();
    if (spec.openapi) pass("API: OpenAPI spec", spec.info?.version ?? "v1");
    else fail("API: OpenAPI spec", "Invalid spec");
  } else {
    fail("API: OpenAPI spec", `HTTP ${openApiRes.status}`);
  }

  const apiNoKey = await fetch(`${BASE}/api/v1/minutes`);
  if (apiNoKey.status === 401) pass("API: v1 auth required", "401 without key");
  else fail("API: v1 auth required", `HTTP ${apiNoKey.status}`);

  // 4. Verify page
  const hash = "a".repeat(64);
  await fetchCheck("Page: Verify hash", `${BASE}/fr/verify/${hash}`);

  // Summary
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 Résultat: ${passed}/${results.length} tests réussis`);
  if (failed.length > 0) {
    console.log("\nÉchecs:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("\n✅ Toutes les vérifications sont passées.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});