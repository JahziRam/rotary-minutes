import { prisma } from "@/lib/prisma";
import type { PrismaClient, SubscriptionPlan } from "@/generated/prisma/client";
import {
  type PlanConfigData,
  type BillingSettings,
  type PublicPlan,
  toPublicPlan,
  getStripePriceId,
} from "@/lib/plans-utils";

export type { PlanConfigData, BillingSettings, PublicPlan };
export {
  computeAnnualPrice,
  computeAnnualPerMonth,
  toPublicPlan,
  formatPrice,
  getStripePriceId,
} from "@/lib/plans-utils";

const DEFAULT_PLANS: Omit<PlanConfigData, "plan">[] = [
  {
    nameFr: "Starter",
    nameEn: "Starter",
    descriptionFr: "Idéal pour les petits clubs",
    descriptionEn: "Ideal for small clubs",
    priceMonthly: 19,
    featuresFr: [
      "Jusqu'à 30 membres",
      "PV, réunions & cotisations",
      "Actions, calendrier & portail membre",
    ],
    featuresEn: [
      "Up to 30 members",
      "Minutes, meetings & dues",
      "Actions, calendar & member portal",
    ],
    stripePriceIdMonthly: process.env.STRIPE_STARTER_PRICE_ID ?? null,
    stripePriceIdAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? null,
    memberLimit: 30,
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    nameFr: "Professional",
    nameEn: "Professional",
    descriptionFr: "Pour les clubs actifs",
    descriptionEn: "For active clubs",
    priceMonthly: 39,
    featuresFr: [
      "Membres illimités",
      "Trésorerie, événements & assiduité",
      "Emails, stats & notifications",
    ],
    featuresEn: [
      "Unlimited members",
      "Treasury, events & attendance",
      "Emails, stats & notifications",
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? null,
    memberLimit: null,
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    nameFr: "Enterprise",
    nameEn: "Enterprise",
    descriptionFr: "Multi-clubs et support prioritaire",
    descriptionEn: "Multi-club and priority support",
    priceMonthly: 79,
    featuresFr: [
      "Gouvernance & archives complètes",
      "District, API & intégrations",
      "PWA hors ligne & support prioritaire",
    ],
    featuresEn: [
      "Governance & full archives",
      "District, API & integrations",
      "Offline PWA & priority support",
    ],
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? null,
    stripePriceIdAnnual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ?? null,
    memberLimit: null,
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
];

const PLAN_KEYS: SubscriptionPlan[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

export async function ensurePlanConfigs(db: Pick<PrismaClient, "planConfig"> = prisma) {
  for (let i = 0; i < PLAN_KEYS.length; i++) {
    const plan = PLAN_KEYS[i];
    const defaults = DEFAULT_PLANS[i];
    await db.planConfig.upsert({
      where: { plan },
      update: {},
      create: { plan, ...defaults },
    });
  }
}

export async function getBillingSettings(): Promise<BillingSettings> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return {
    annualDiscountPercent: settings?.annualDiscountPercent ?? 20,
    currency: settings?.currency ?? "EUR",
    stripeEnabled: settings?.stripeEnabled ?? false,
  };
}

export async function getAllPlanConfigs(): Promise<PlanConfigData[]> {
  await ensurePlanConfigs();
  const rows = await prisma.planConfig.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(mapPlanRow);
}

const FALLBACK_BILLING: BillingSettings = {
  annualDiscountPercent: 20,
  currency: "EUR",
  stripeEnabled: false,
};

function defaultPlanRows(): PlanConfigData[] {
  return PLAN_KEYS.map((plan, i) => ({
    plan,
    ...DEFAULT_PLANS[i],
  }));
}

export async function getActivePublicPlans(locale: string): Promise<{
  plans: PublicPlan[];
  billing: BillingSettings;
}> {
  try {
    await ensurePlanConfigs();
    const [rows, billing] = await Promise.all([
      prisma.planConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      getBillingSettings(),
    ]);

    return {
      billing,
      plans: rows.map((row) =>
        toPublicPlan(mapPlanRow(row), locale, billing.annualDiscountPercent)
      ),
    };
  } catch (e) {
    console.error("[getActivePublicPlans] DB unavailable, using defaults:", e);
    const billing = FALLBACK_BILLING;
    return {
      billing,
      plans: defaultPlanRows().map((row) =>
        toPublicPlan(row, locale, billing.annualDiscountPercent)
      ),
    };
  }
}

function mapPlanRow(row: {
  plan: SubscriptionPlan;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  priceMonthly: number;
  featuresFr: string[];
  featuresEn: string[];
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  memberLimit: number | null;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}): PlanConfigData {
  return {
    plan: row.plan,
    nameFr: row.nameFr,
    nameEn: row.nameEn,
    descriptionFr: row.descriptionFr,
    descriptionEn: row.descriptionEn,
    priceMonthly: row.priceMonthly,
    featuresFr: row.featuresFr,
    featuresEn: row.featuresEn,
    stripePriceIdMonthly: row.stripePriceIdMonthly,
    stripePriceIdAnnual: row.stripePriceIdAnnual,
    memberLimit: row.memberLimit,
    isActive: row.isActive,
    isPopular: row.isPopular,
    sortOrder: row.sortOrder,
  };
}