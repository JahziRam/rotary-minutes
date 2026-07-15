import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";
import type { ComparisonRowKey } from "@/lib/plan-comparison";

export interface PlanConfigData {
  plan: SubscriptionPlan;
  nameFr: string;
  nameEn: string;
  nameEs: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  descriptionEs: string | null;
  priceMonthly: number;
  featuresFr: string[];
  featuresEn: string[];
  featuresEs: string[];
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  memberLimit: number | null;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

export interface BillingSettings {
  annualDiscountPercent: number;
  currency: string;
  stripeEnabled: boolean;
  /** Tableau comparatif des offres sur la page d'accueil (désactivé par défaut). */
  showPricingComparison: boolean;
  comparisonOverrides: ComparisonOverrides;
}

export type ComparisonOverrideValue = boolean | string;
export type ComparisonOverrides = Partial<
  Record<ComparisonRowKey, Partial<Record<SubscriptionPlan, ComparisonOverrideValue>>>
>;

type AppSettingsConfig = {
  pricing?: {
    showComparisonTable?: boolean;
    comparisonOverrides?: ComparisonOverrides;
  };
};

export function readShowPricingComparison(config: unknown): boolean {
  const parsed = config as AppSettingsConfig | null | undefined;
  return parsed?.pricing?.showComparisonTable === true;
}

export function readComparisonOverrides(config: unknown): ComparisonOverrides {
  const parsed = config as AppSettingsConfig | null | undefined;
  return parsed?.pricing?.comparisonOverrides ?? {};
}

export interface PublicPlan {
  plan: SubscriptionPlan;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  priceAnnualPerMonth: number;
  annualSavings: number;
  features: string[];
  isPopular: boolean;
  memberLimit: number | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}

export const TRIAL_PLAN_LABELS = {
  fr: "Essai gratuit",
  en: "Free trial",
  es: "Prueba gratuita",
} as const;

export type PlanOption = { key: string; label: string };

export function buildPlanLabelMap(
  configs: PlanConfigData[],
  locale: string
): Record<string, string> {
  const isFr = locale === "fr";
  const isEs = locale === "es";
  const map: Record<string, string> = {
    TRIAL: isFr ? TRIAL_PLAN_LABELS.fr : isEs ? TRIAL_PLAN_LABELS.es : TRIAL_PLAN_LABELS.en,
  };
  for (const config of configs) {
    map[config.plan] = isFr
      ? config.nameFr
      : isEs
        ? config.nameEs || config.nameEn
        : config.nameEn;
  }
  return map;
}

export function localizedPlanName(
  plan: string | undefined,
  locale: string,
  labels: Record<string, string>
): string {
  const key = plan ?? "TRIAL";
  if (labels[key]) return labels[key];
  const isFr = locale === "fr";
  const isEs = locale === "es";
  if (key === "TRIAL") {
    return isFr ? TRIAL_PLAN_LABELS.fr : isEs ? TRIAL_PLAN_LABELS.es : TRIAL_PLAN_LABELS.en;
  }
  return key;
}

export function planGridClass(count: number, prefix = "grid"): string {
  if (count <= 1) return `${prefix} grid-cols-1 gap-6`;
  if (count === 2) return `${prefix} sm:grid-cols-2 gap-6`;
  return `${prefix} sm:grid-cols-2 lg:grid-cols-3 gap-6`;
}

export function computeAnnualPrice(monthly: number, discountPercent: number): number {
  const yearly = monthly * 12;
  return Math.round(yearly * (1 - discountPercent / 100));
}

export function computeAnnualPerMonth(monthly: number, discountPercent: number): number {
  return Math.round((computeAnnualPrice(monthly, discountPercent) / 12) * 100) / 100;
}

export function toPublicPlan(
  plan: PlanConfigData,
  locale: string,
  discountPercent: number
): PublicPlan {
  const isFr = locale === "fr";
  const isEs = locale === "es";
  const priceAnnual = computeAnnualPrice(plan.priceMonthly, discountPercent);
  const priceAnnualPerMonth = computeAnnualPerMonth(plan.priceMonthly, discountPercent);
  const annualSavings = plan.priceMonthly * 12 - priceAnnual;

  return {
    plan: plan.plan,
    name: isFr ? plan.nameFr : isEs ? plan.nameEs || plan.nameEn : plan.nameEn,
    description: isFr
      ? plan.descriptionFr
      : isEs
        ? plan.descriptionEs ?? plan.descriptionEn
        : plan.descriptionEn,
    priceMonthly: plan.priceMonthly,
    priceAnnual,
    priceAnnualPerMonth,
    annualSavings,
    features: isFr ? plan.featuresFr : isEs ? plan.featuresEs : plan.featuresEn,
    isPopular: plan.isPopular,
    memberLimit: plan.memberLimit,
    stripePriceIdMonthly: plan.stripePriceIdMonthly,
    stripePriceIdAnnual: plan.stripePriceIdAnnual,
  };
}

export function formatPrice(amount: number, currency: string, locale: string): string {
  const numberLocale =
    locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function getStripePriceId(
  plan: PublicPlan,
  interval: BillingInterval
): string | null {
  return interval === "ANNUAL" ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
}