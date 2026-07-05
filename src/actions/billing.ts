"use server";

import { revalidatePath } from "next/cache";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission, requireSuperAdmin } from "@/lib/require-permission";
import {
  validatePromoCode,
  normalizePromoCode,
  getReferralRewardDays,
  extendSubscriptionPeriod,
} from "@/lib/billing";
import type { AddonKey, PromoDiscountType } from "@/generated/prisma/client";

function revalidateBillingPaths(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/subscription`);
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/admin/subscriptions`);
  }
  revalidatePath(`/${locale}/admin/subscriptions`);
}

// ─── Promo codes (admin) ─────────────────────────────────────────────────────

export async function listPromoCodes() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return { success: true as const, promos };
}

export async function createPromoCode(
  data: {
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    validFrom?: string;
    validUntil?: string | null;
    maxUses?: number | null;
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const code = normalizePromoCode(data.code);
  if (!code) return { error: "INVALID_CODE" as const };

  const existing = await prisma.promoCode.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
  });
  if (existing) return { error: "CODE_EXISTS" as const };

  const promo = await prisma.promoCode.create({
    data: {
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      maxUses: data.maxUses ?? null,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.ctx.userId,
      action: "PROMO_CODE_CREATED",
      entity: "PromoCode",
      entityId: promo.id,
      metadata: { code },
    },
  });

  revalidateBillingPaths(locale);
  return { success: true as const, promo };
}

export async function updatePromoCode(
  id: string,
  data: {
    discountType?: PromoDiscountType;
    discountValue?: number;
    validFrom?: string;
    validUntil?: string | null;
    maxUses?: number | null;
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const promo = await prisma.promoCode.update({
    where: { id },
    data: {
      discountType: data.discountType,
      discountValue: data.discountValue,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil:
        data.validUntil === null
          ? null
          : data.validUntil
            ? new Date(data.validUntil)
            : undefined,
      maxUses: data.maxUses === null ? null : data.maxUses,
      isActive: data.isActive,
    },
  });

  revalidateBillingPaths(locale);
  return { success: true as const, promo };
}

export async function deletePromoCode(id: string, locale: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  await prisma.promoCode.delete({ where: { id } });
  revalidateBillingPaths(locale);
  return { success: true as const };
}

// ─── Promo apply (club) ──────────────────────────────────────────────────────

export async function applyPromoCode(code: string) {
  const auth = await requirePermission("settings.manage");
  if ("error" in auth) return auth;

  const result = await validatePromoCode(code);
  if (!result.valid) return { error: result.error };

  return {
    success: true as const,
    promo: {
      id: result.promo.id,
      code: result.promo.code,
      discountType: result.promo.discountType,
      discountValue: result.promo.discountValue,
    },
  };
}

// ─── Addons ──────────────────────────────────────────────────────────────────

export async function updateAddonConfig(
  key: AddonKey,
  data: {
    nameFr: string;
    nameEn: string;
    priceMonthly: number;
    stripePriceId?: string | null;
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const addon = await prisma.addonConfig.update({
    where: { key },
    data: {
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      priceMonthly: data.priceMonthly,
      stripePriceId: data.stripePriceId ?? null,
      isActive: data.isActive,
    },
  });

  revalidateBillingPaths(locale);
  return { success: true as const, addon };
}

export async function activateAddon(addonKey: AddonKey, locale: string) {
  const auth = await requirePermission("settings.manage");
  if ("error" in auth) return auth;

  const config = await prisma.addonConfig.findUnique({ where: { key: addonKey } });
  if (!config?.isActive) return { error: "ADDON_UNAVAILABLE" as const };

  const sub = await prisma.subscription.findUnique({
    where: { clubId: auth.ctx.clubId },
  });
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
    return { error: "SUBSCRIPTION_REQUIRED" as const };
  }

  const periodEnd = sub.currentPeriodEnd ?? addMonths(new Date(), 1);

  await prisma.clubAddon.upsert({
    where: {
      clubId_addonKey: { clubId: auth.ctx.clubId, addonKey },
    },
    update: { expiresAt: periodEnd },
    create: {
      clubId: auth.ctx.clubId,
      addonKey,
      expiresAt: periodEnd,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: auth.ctx.clubId,
      userId: auth.ctx.userId,
      action: "ADDON_ACTIVATED",
      entity: "ClubAddon",
      metadata: { addonKey },
    },
  });

  revalidateBillingPaths(locale);
  return { success: true as const };
}

export async function deactivateClubAddon(
  clubId: string,
  addonKey: AddonKey,
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  await prisma.clubAddon.deleteMany({
    where: { clubId, addonKey },
  });

  revalidateBillingPaths(locale);
  return { success: true as const };
}

// ─── Referrals ───────────────────────────────────────────────────────────────

async function linkReferralInternal(
  referredClubId: string,
  referrerCode: string,
  userId?: string
) {
  const code = referrerCode.trim().toLowerCase();
  if (!code) return { error: "INVALID_CODE" as const };

  const referrer = await prisma.club.findFirst({
    where: { slug: { equals: code, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!referrer) return { error: "REFERRER_NOT_FOUND" as const };
  if (referrer.id === referredClubId) return { error: "SELF_REFERRAL" as const };

  const existing = await prisma.referral.findUnique({
    where: { referredClubId },
  });
  if (existing) return { error: "ALREADY_REFERRED" as const };

  await prisma.$transaction([
    prisma.referral.create({
      data: {
        referrerClubId: referrer.id,
        referredClubId,
      },
    }),
    prisma.subscription.update({
      where: { clubId: referredClubId },
      data: { referredByClubId: referrer.id },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      clubId: referredClubId,
      userId,
      action: "REFERRAL_RECORDED",
      entity: "Referral",
      metadata: { referrerClubId: referrer.id, referrerCode: code },
    },
  });

  return { success: true as const, referrerName: referrer.name };
}

export async function recordReferral(referrerCode: string) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };
  return linkReferralInternal(ctx.clubId, referrerCode, ctx.userId);
}

export async function linkClubReferral(referredClubId: string, referrerCode: string) {
  return linkReferralInternal(referredClubId, referrerCode);
}

export async function processReferralReward(referredClubId: string) {
  const referral = await prisma.referral.findUnique({
    where: { referredClubId },
  });
  if (!referral || referral.rewardApplied) return;

  const rewardDays = getReferralRewardDays();
  await extendSubscriptionPeriod(referral.referrerClubId, rewardDays);

  await prisma.referral.update({
    where: { id: referral.id },
    data: { rewardApplied: true },
  });

  await prisma.auditLog.create({
    data: {
      clubId: referral.referrerClubId,
      action: "REFERRAL_REWARD_APPLIED",
      entity: "Referral",
      entityId: referral.id,
      metadata: { referredClubId, rewardDays },
    },
  });
}