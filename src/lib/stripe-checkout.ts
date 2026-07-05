import { addMonths, addYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { processReferralReward } from "@/actions/billing";
import type {
  BillingInterval,
  PromoCode,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/generated/prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function getOrCreateStripeCustomer(
  clubId: string,
  email?: string | null
): Promise<string> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const sub = await prisma.subscription.findUnique({ where: { clubId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { name: true, email: true },
  });

  const customer = await stripe.customers.create({
    email: email ?? club?.email ?? undefined,
    name: club?.name,
    metadata: { clubId },
  });

  await prisma.subscription.upsert({
    where: { clubId },
    update: { stripeCustomerId: customer.id },
    create: {
      clubId,
      stripeCustomerId: customer.id,
      plan: "TRIAL",
      status: "TRIALING",
    },
  });

  return customer.id;
}

async function createStripeCouponForPromo(promo: PromoCode): Promise<string | undefined> {
  const stripe = await getStripe();
  if (!stripe) return undefined;

  const params =
    promo.discountType === "PERCENT"
      ? {
          percent_off: promo.discountValue,
          duration: "once" as const,
          name: promo.code,
        }
      : {
          amount_off: promo.discountValue * 100,
          currency: "eur",
          duration: "once" as const,
          name: promo.code,
        };

  const coupon = await stripe.coupons.create(params);
  return coupon.id;
}

export async function createCheckoutSession(params: {
  clubId: string;
  planKey: SubscriptionPlan;
  billingInterval: BillingInterval;
  stripePriceId: string;
  locale: string;
  promoCodeId?: string;
  userEmail?: string | null;
}): Promise<{ url: string }> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const customerId = await getOrCreateStripeCustomer(params.clubId, params.userEmail);

  let discounts: { coupon: string }[] | undefined;
  if (params.promoCodeId) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: params.promoCodeId },
    });
    if (promo) {
      const couponId = await createStripeCouponForPromo(promo);
      if (couponId) discounts = [{ coupon: couponId }];
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    discounts,
    success_url: `${APP_URL}/${params.locale}/settings/subscription?checkout=success`,
    cancel_url: `${APP_URL}/${params.locale}/settings/subscription?checkout=cancel`,
    metadata: {
      clubId: params.clubId,
      planKey: params.planKey,
      billingInterval: params.billingInterval,
      promoCodeId: params.promoCodeId ?? "",
      locale: params.locale,
    },
    subscription_data: {
      metadata: {
        clubId: params.clubId,
        planKey: params.planKey,
        billingInterval: params.billingInterval,
      },
    },
  });

  if (!session.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
  return { url: session.url };
}

export async function createBillingPortalSession(
  clubId: string,
  locale: string
): Promise<{ url: string }> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const sub = await prisma.subscription.findUnique({ where: { clubId } });
  if (!sub?.stripeCustomerId) throw new Error("NO_STRIPE_CUSTOMER");

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}/${locale}/settings/subscription`,
  });

  return { url: session.url };
}

function periodEndFromInterval(interval: BillingInterval, from = new Date()): Date {
  return interval === "ANNUAL" ? addYears(from, 1) : addMonths(from, 1);
}

export async function activateSubscriptionFromStripe(params: {
  clubId: string;
  planKey: SubscriptionPlan;
  billingInterval: BillingInterval;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  status?: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  promoCodeId?: string | null;
}): Promise<void> {
  const status = params.status ?? "ACTIVE";
  const periodEnd =
    params.currentPeriodEnd ?? periodEndFromInterval(params.billingInterval);

  const existing = await prisma.subscription.findUnique({
    where: { clubId: params.clubId },
  });

  await prisma.subscription.upsert({
    where: { clubId: params.clubId },
    update: {
      plan: params.planKey,
      billingInterval: params.billingInterval,
      status,
      stripePriceId: params.stripePriceId ?? undefined,
      stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
      stripeCustomerId: params.stripeCustomerId ?? undefined,
      currentPeriodEnd: periodEnd,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
      trialEndsAt: null,
      promoCodeId: params.promoCodeId || existing?.promoCodeId || null,
    },
    create: {
      clubId: params.clubId,
      plan: params.planKey,
      billingInterval: params.billingInterval,
      status,
      stripePriceId: params.stripePriceId ?? undefined,
      stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
      stripeCustomerId: params.stripeCustomerId ?? undefined,
      currentPeriodEnd: periodEnd,
      promoCodeId: params.promoCodeId || null,
    },
  });

  if (params.promoCodeId) {
    await prisma.promoCode.update({
      where: { id: params.promoCodeId },
      data: { usedCount: { increment: 1 } },
    });
  }

  if (status === "ACTIVE") {
    await processReferralReward(params.clubId);
  }
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}