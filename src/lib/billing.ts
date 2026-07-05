import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type {
  AddonKey,
  PrismaClient,
  PromoCode,
} from "@/generated/prisma/client";
import { normalizePromoCode } from "@/lib/billing-utils";

export type { PromoDiscountType } from "@/generated/prisma/client";
export {
  normalizePromoCode,
  computeDiscountedPrice,
  getReferralRewardDays,
} from "@/lib/billing-utils";

export type PromoValidationError =
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "MAX_USES_REACHED";

export type PromoValidationResult =
  | { valid: true; promo: PromoCode }
  | { valid: false; error: PromoValidationError };

const DEFAULT_ADDONS: {
  key: AddonKey;
  nameFr: string;
  nameEn: string;
  priceMonthly: number;
}[] = [
  {
    key: "EMAILS",
    nameFr: "Module emails",
    nameEn: "Email module",
    priceMonthly: 9,
  },
  {
    key: "DISTRICT",
    nameFr: "Tableau de bord district",
    nameEn: "District dashboard",
    priceMonthly: 15,
  },
  {
    key: "ADVANCED_STATS",
    nameFr: "Statistiques avancées",
    nameEn: "Advanced statistics",
    priceMonthly: 7,
  },
];

export async function validatePromoCode(code: string): Promise<PromoValidationResult> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return { valid: false, error: "NOT_FOUND" };

  const promo = await prisma.promoCode.findFirst({
    where: { code: { equals: normalized, mode: "insensitive" } },
  });

  if (!promo) return { valid: false, error: "NOT_FOUND" };
  if (!promo.isActive) return { valid: false, error: "INACTIVE" };

  const now = new Date();
  if (promo.validFrom > now) return { valid: false, error: "NOT_YET_VALID" };
  if (promo.validUntil && promo.validUntil < now) {
    return { valid: false, error: "EXPIRED" };
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { valid: false, error: "MAX_USES_REACHED" };
  }

  return { valid: true, promo };
}

export async function ensureAddonConfigs(
  db: Pick<PrismaClient, "addonConfig"> = prisma
): Promise<void> {
  for (const addon of DEFAULT_ADDONS) {
    await db.addonConfig.upsert({
      where: { key: addon.key },
      update: {},
      create: addon,
    });
  }
}

export async function clubHasAddon(
  clubId: string,
  addonKey: AddonKey
): Promise<boolean> {
  const addon = await prisma.clubAddon.findUnique({
    where: { clubId_addonKey: { clubId, addonKey } },
  });
  if (!addon) return false;
  if (addon.expiresAt && addon.expiresAt < new Date()) return false;
  return true;
}

/** Stripe checkout, webhooks et portail client : voir src/lib/stripe-checkout.ts (Phase 9). */
export async function extendSubscriptionPeriod(
  clubId: string,
  days: number
): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { clubId } });
  if (!sub) return;

  const base =
    sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
      ? sub.currentPeriodEnd
      : new Date();

  await prisma.subscription.update({
    where: { clubId },
    data: { currentPeriodEnd: addDays(base, days) },
  });
}