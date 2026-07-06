"use server";

import { revalidatePath } from "next/cache";
import { addMonths, addYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { getBillingSettings, getActivePublicPlans, getStripePriceId } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import {
  validatePromoCode,
  computeDiscountedPrice,
} from "@/lib/billing";
import { processReferralReward } from "@/actions/billing";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/lib/stripe-checkout";
import { formatPrice } from "@/lib/plans-utils";
import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";

function revalidateSubscriptionPaths() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/subscription`);
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/dashboard`);
  }
}

export async function choosePlan(
  planKey: SubscriptionPlan,
  billingInterval: BillingInterval,
  locale: string,
  promoCode?: string
) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false));
  if (!canManage) return { error: "FORBIDDEN" as const };

  const { plans, billing } = await getActivePublicPlans(locale);
  const plan = plans.find((p) => p.plan === planKey);
  if (!plan) return { error: "INVALID_PLAN" as const };

  let promoCodeId: string | undefined;
  let discountLabel: string | undefined;

  if (promoCode?.trim()) {
    const promoResult = await validatePromoCode(promoCode);
    if (!promoResult.valid) {
      return { error: promoResult.error };
    }

    const basePrice =
      billingInterval === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
    const discounted = computeDiscountedPrice(
      basePrice,
      promoResult.promo.discountType,
      promoResult.promo.discountValue
    );

    promoCodeId = promoResult.promo.id;
    discountLabel = formatPrice(discounted, billing.currency, locale);
  }

  const stripePriceId = getStripePriceId(plan, billingInterval);

  const stripeClient = await getStripe();
  if (billing.stripeEnabled && stripeClient && stripePriceId) {
    try {
      const session = await createCheckoutSession({
        clubId: ctx.clubId,
        planKey,
        billingInterval,
        stripePriceId,
        locale,
        promoCodeId,
        userEmail: null,
      });

      return { success: true as const, checkoutUrl: session.url };
    } catch {
      return { error: "STRIPE_CHECKOUT_FAILED" as const };
    }
  }

  const now = new Date();
  const periodEnd =
    billingInterval === "ANNUAL" ? addYears(now, 1) : addMonths(now, 1);

  if (promoCodeId) {
    await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { usedCount: { increment: 1 } },
    });
  }

  await prisma.subscription.upsert({
    where: { clubId: ctx.clubId },
    update: {
      plan: planKey,
      billingInterval,
      status: "ACTIVE",
      stripePriceId: stripePriceId ?? undefined,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      promoCodeId: promoCodeId ?? null,
      trialEndsAt: null,
    },
    create: {
      clubId: ctx.clubId,
      plan: planKey,
      billingInterval,
      status: "ACTIVE",
      stripePriceId: stripePriceId ?? undefined,
      currentPeriodEnd: periodEnd,
      promoCodeId,
    },
  });

  await processReferralReward(ctx.clubId);

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "SUBSCRIPTION_PLAN_CHOSEN",
      entity: "Subscription",
      entityId: ctx.clubId,
      metadata: {
        plan: planKey,
        billingInterval,
        promoCode: promoCode?.trim() || null,
        discountedPrice: discountLabel ?? null,
      },
    },
  });

  const { syncClubFeaturesFromPlan } = await import("@/lib/features");
  await syncClubFeaturesFromPlan(ctx.clubId, planKey);

  revalidateSubscriptionPaths();

  const intervalLabel =
    billingInterval === "ANNUAL"
      ? locale === "fr"
        ? "annuel"
        : "annual"
      : locale === "fr"
        ? "mensuel"
        : "monthly";

  const discountNote =
    discountLabel &&
    (locale === "fr"
      ? ` (prix après réduction : ${discountLabel})`
      : ` (discounted price: ${discountLabel})`);

  return {
    success: true as const,
    message:
      locale === "fr"
        ? `Abonnement ${plan.name} (${intervalLabel}) activé.${discountNote ?? ""}`
        : `${plan.name} subscription (${intervalLabel}) activated.${discountNote ?? ""}`,
  };
}

export async function openBillingPortal(locale: string) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false));
  if (!canManage) return { error: "FORBIDDEN" as const };

  const billing = await getBillingSettings();
  const stripeClient = await getStripe();
  if (!billing.stripeEnabled || !stripeClient) {
    return { error: "STRIPE_DISABLED" as const };
  }

  try {
    const session = await createBillingPortalSession(ctx.clubId, locale);
    return { success: true as const, portalUrl: session.url };
  } catch {
    return { error: "NO_STRIPE_CUSTOMER" as const };
  }
}