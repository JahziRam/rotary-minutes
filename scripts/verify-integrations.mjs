/**
 * Integration checks: GA4, pricing DB, Stripe IDs, treasury API, landing.
 * Run: npm run verify:integrations
 */
import "dotenv/config";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  console.log(`⚠️  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchStatus(name, url, expect = [200, 307, 302]) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (expect.includes(res.status)) {
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
  console.log("\n🔌 Rotary Minutes — Vérification intégrations\n");

  // Env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) pass("ENV: NEXT_PUBLIC_APP_URL", appUrl);
  else warn("ENV: NEXT_PUBLIC_APP_URL", "non défini");

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (gaId?.startsWith("G-")) pass("ENV: GA4 measurement ID", gaId);
  else warn("ENV: GA4", "NEXT_PUBLIC_GA_MEASUREMENT_ID manquant ou invalide");

  if (process.env.DATABASE_URL) pass("ENV: DATABASE_URL", "défini");
  else fail("ENV: DATABASE_URL", "manquant");

  // DB: plans & stripe alignment
  try {
    const { PrismaClient } = await import("../src/generated/prisma/client.ts");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
    if (settings) {
      pass("DB: AppSettings", `${settings.currency}, −${settings.annualDiscountPercent}% annuel`);
      if (settings.stripeEnabled) pass("DB: Stripe activé", "oui");
      else warn("DB: Stripe", "désactivé en base");
    } else fail("DB: AppSettings");

    const plans = await prisma.planConfig.findMany({ where: { isActive: true } });
    if (plans.length >= 3) pass("DB: Plans actifs", `${plans.length} offres`);
    else fail("DB: Plans actifs", `${plans.length} trouvés`);

    if (settings?.stripeEnabled) {
      for (const p of plans) {
        if (!p.stripePriceIdMonthly && !p.stripePriceIdAnnual) {
          warn(`Stripe: ${p.plan}`, "aucun Price ID — checkout Stripe indisponible");
        } else {
          pass(`Stripe: ${p.plan}`, "Price ID configuré");
        }
      }
    }

    const configGa =
      settings?.config && typeof settings.config === "object"
        ? settings.config.analytics?.gaMeasurementId
        : null;
    if (configGa?.startsWith("G-")) pass("DB: GA4 (admin)", configGa);
    else if (gaId) pass("DB: GA4 (admin)", "via env uniquement");
    else warn("DB: GA4", "non configuré en base ni env");

    const addons = await prisma.addonConfig.count({ where: { isActive: true } });
    pass("DB: Add-ons actifs", String(addons));

    await prisma.$disconnect();
  } catch (e) {
    fail("DB: Connexion", e.message);
  }

  // HTTP
  await fetchStatus("Landing FR (pricing)", `${BASE}/fr`);
  await fetchStatus("Landing EN", `${BASE}/en`);
  await fetchStatus("Privacy FR", `${BASE}/fr/privacy`);
  await fetchStatus("Subscription (auth)", `${BASE}/fr/settings/subscription`, [307, 302, 401, 403]);
  await fetchStatus("Treasury (auth)", `${BASE}/fr/treasury`, [307, 302, 401, 403]);

  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (health?.ok) pass("API: /api/health", `HTTP ${health.status}`);
  else fail("API: /api/health");

  const analyticsApi = await fetch(`${BASE}/api/analytics-config`).catch(() => null);
  if (analyticsApi?.ok) {
    const data = await analyticsApi.json();
    if (data.measurementId || data.enabled === false) {
      pass("API: /api/analytics-config", data.measurementId ?? "disabled");
    } else warn("API: analytics-config", JSON.stringify(data));
  } else {
    fail("API: /api/analytics-config");
  }

  const treasuryExport = await fetch(`${BASE}/api/treasury/export`);
  if (treasuryExport.status === 401) pass("API: treasury export protégé", "401");
  else warn("API: treasury export", `HTTP ${treasuryExport.status}`);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 Résultat: ${passed}/${results.length} OK`);
  if (failed.length > 0) {
    console.log("\nÉchecs:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("\n✅ Vérifications intégrations terminées.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});