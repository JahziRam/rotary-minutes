import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";

export interface PlanConfigData {
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
}

export interface BillingSettings {
  annualDiscountPercent: number;
  currency: string;
  stripeEnabled: boolean;
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
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
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
  const priceAnnual = computeAnnualPrice(plan.priceMonthly, discountPercent);
  const priceAnnualPerMonth = computeAnnualPerMonth(plan.priceMonthly, discountPercent);
  const annualSavings = plan.priceMonthly * 12 - priceAnnual;

  return {
    plan: plan.plan,
    name: isFr ? plan.nameFr : plan.nameEn,
    description: isFr ? plan.descriptionFr : plan.descriptionEn,
    priceMonthly: plan.priceMonthly,
    priceAnnual,
    priceAnnualPerMonth,
    annualSavings,
    features: isFr ? plan.featuresFr : plan.featuresEn,
    isPopular: plan.isPopular,
    stripePriceIdMonthly: plan.stripePriceIdMonthly,
    stripePriceIdAnnual: plan.stripePriceIdAnnual,
  };
}

export function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
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