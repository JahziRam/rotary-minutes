import type { PromoDiscountType } from "@/generated/prisma/client";

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function computeDiscountedPrice(
  basePrice: number,
  discountType: PromoDiscountType,
  discountValue: number
): number {
  if (discountType === "PERCENT") {
    return Math.max(0, Math.round(basePrice * (1 - discountValue / 100)));
  }
  return Math.max(0, basePrice - discountValue);
}

export function getReferralRewardDays(): number {
  const parsed = parseInt(process.env.REFERRAL_REWARD_DAYS ?? "30", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}