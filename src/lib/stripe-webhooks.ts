import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  activateSubscriptionFromStripe,
  mapStripeSubscriptionStatus,
} from "@/lib/stripe-checkout";
import { recordSubscriptionPayment } from "@/lib/subscription-payments";
import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";

function parseMetadata(
  metadata: Stripe.Metadata | null | undefined
): {
  clubId: string;
  planKey: SubscriptionPlan;
  billingInterval: BillingInterval;
  promoCodeId?: string;
} | null {
  const clubId = metadata?.clubId;
  const planKey = metadata?.planKey as SubscriptionPlan | undefined;
  const billingInterval = metadata?.billingInterval as BillingInterval | undefined;
  if (!clubId || !planKey || !billingInterval) return null;

  const promoCodeId = metadata?.promoCodeId?.trim() || undefined;
  return { clubId, planKey, billingInterval, promoCodeId };
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const meta = parseMetadata(session.metadata);
  if (!meta) return;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  await activateSubscriptionFromStripe({
    clubId: meta.clubId,
    planKey: meta.planKey,
    billingInterval: meta.billingInterval,
    stripeSubscriptionId,
    stripeCustomerId,
    promoCodeId: meta.promoCodeId,
    status: "ACTIVE",
  });

  await prisma.auditLog.create({
    data: {
      clubId: meta.clubId,
      action: "STRIPE_CHECKOUT_COMPLETED",
      entity: "Subscription",
      entityId: meta.clubId,
      metadata: {
        plan: meta.planKey,
        billingInterval: meta.billingInterval,
        sessionId: session.id,
      },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { clubId: meta.clubId },
    select: { id: true },
  });

  if (session.amount_total && session.amount_total > 0) {
    await recordSubscriptionPayment({
      clubId: meta.clubId,
      subscriptionId: subscription?.id,
      kind: "CHECKOUT",
      stripeSessionId: session.id,
      amountCents: session.amount_total,
      currency: (session.currency ?? "eur").toUpperCase(),
      status: session.payment_status ?? "paid",
      plan: meta.planKey,
      billingInterval: meta.billingInterval,
      paidAt: new Date(),
      metadata: {
        customerEmail: session.customer_email,
        mode: session.mode,
      },
    });
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const meta = parseMetadata(subscription.metadata);
  if (!meta) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const periodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000)
    : undefined;

  await activateSubscriptionFromStripe({
    clubId: meta.clubId,
    planKey: meta.planKey,
    billingInterval: meta.billingInterval,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
    stripePriceId: priceId,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEnd,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const meta = parseMetadata(subscription.metadata);
  if (!meta) return;

  await prisma.subscription.update({
    where: { clubId: meta.clubId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      stripeSubscriptionId: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: meta.clubId,
      action: "STRIPE_SUBSCRIPTION_CANCELLED",
      entity: "Subscription",
      entityId: meta.clubId,
      metadata: { subscriptionId: subscription.id },
    },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const rawSubscription = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    }
  ).subscription;
  const subscriptionId =
    typeof rawSubscription === "string"
      ? rawSubscription
      : rawSubscription?.id;
  if (!subscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!sub) return;

  const periodEnd = invoice.lines.data[0]?.period?.end
    ? new Date(invoice.lines.data[0].period.end * 1000)
    : undefined;

  if (periodEnd) {
    await prisma.subscription.update({
      where: { clubId: sub.clubId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
    });
  }

  const amountCents = invoice.amount_paid ?? invoice.total ?? 0;
  const rawPaymentIntent = (
    invoice as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
    }
  ).payment_intent;
  const paymentIntentId =
    typeof rawPaymentIntent === "string"
      ? rawPaymentIntent
      : rawPaymentIntent?.id;

  if (amountCents > 0) {
    await recordSubscriptionPayment({
      clubId: sub.clubId,
      subscriptionId: sub.id,
      kind: "INVOICE",
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: paymentIntentId,
      amountCents,
      currency: (invoice.currency ?? "eur").toUpperCase(),
      status: invoice.status ?? "paid",
      plan: sub.plan,
      billingInterval: sub.billingInterval,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      metadata: {
        invoiceNumber: invoice.number,
        billingReason: invoice.billing_reason,
      },
    });
  }
}