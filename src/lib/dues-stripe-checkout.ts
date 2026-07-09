import { prisma } from "@/lib/prisma";
import { getClubStripe, isClubDuesStripeEnabled } from "@/lib/club-stripe";
import { nextReceiptNumber } from "@/lib/dues";
import { sendDuesReceiptEmail } from "@/actions/dues";
import type { PaymentMethod } from "@/generated/prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createMemberDuesCheckoutSession(params: {
  duesId: string;
  clubId: string;
  userId: string;
  locale: string;
  userEmail?: string | null;
}): Promise<{ url: string } | { error: string }> {
  const clubStripeReady = await isClubDuesStripeEnabled(params.clubId);
  if (!clubStripeReady) return { error: "CLUB_STRIPE_DISABLED" };

  const stripe = await getClubStripe(params.clubId);
  if (!stripe) return { error: "CLUB_STRIPE_NOT_CONFIGURED" };

  const dues = await prisma.memberDues.findFirst({
    where: {
      id: params.duesId,
      clubId: params.clubId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      member: { select: { id: true, userId: true, firstName: true, lastName: true } },
      club: { select: { name: true, currency: true } },
    },
  });
  if (!dues) return { error: "NOT_FOUND" };
  if (dues.member.userId !== params.userId) return { error: "FORBIDDEN" };

  const currency = (dues.currency ?? dues.club.currency ?? "EUR").toLowerCase();
  const amountCents = Math.round(Number(dues.amount) * 100);
  if (amountCents < 50) return { error: "AMOUNT_TOO_SMALL" };

  const locale = params.locale === "en" ? "en" : "fr";
  const label =
    dues.periodLabel ??
    `${dues.member.firstName} ${dues.member.lastName} — ${dues.fiscalYear}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.userEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: locale === "fr" ? `Cotisation — ${dues.club.name}` : `Dues — ${dues.club.name}`,
            description: label,
          },
        },
      },
    ],
    success_url: `${APP_URL}/${locale}/my-account?dues=success`,
    cancel_url: `${APP_URL}/${locale}/my-account?dues=cancelled`,
    metadata: {
      kind: "member_dues",
      duesId: dues.id,
      clubId: params.clubId,
      memberId: dues.memberId,
    },
  });

  if (!session.url) return { error: "SESSION_FAILED" };
  return { url: session.url };
}

export async function fulfillMemberDuesCheckout(session: {
  id: string;
  metadata: Record<string, string> | null;
  payment_intent?: string | { id?: string } | null;
}): Promise<boolean> {
  if (session.metadata?.kind !== "member_dues") return false;

  const duesId = session.metadata.duesId;
  const clubId = session.metadata.clubId;
  if (!duesId || !clubId) return false;

  const existing = await prisma.memberDues.findFirst({
    where: { id: duesId, clubId },
    include: {
      member: {
        select: { id: true, userId: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  if (!existing || existing.status === "PAID") return true;

  const receiptNumber =
    existing.receiptNumber ?? (await nextReceiptNumber(clubId, existing.fiscalYear));
  const paidAt = new Date();
  const paymentMethod: PaymentMethod = "STRIPE";
  const stripeRef =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const payment = await prisma.$transaction(async (tx) => {
    await tx.memberDues.update({
      where: { id: duesId },
      data: { status: "PAID", paidAt, receiptNumber },
    });
    return tx.duesPayment.create({
      data: {
        clubId,
        memberId: existing.memberId,
        duesId,
        amount: existing.amount,
        currency: existing.currency,
        paidAt,
        method: "STRIPE",
        paymentMethod,
        receiptNumber,
        notes: stripeRef ? `Stripe ${stripeRef}` : `Stripe session ${session.id}`,
        recordedById: null,
      },
    });
  });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { duesAutoReceiptEmail: true, language: true },
  });
  const locale = club?.language === "EN" ? "en" : "fr";
  if ((club?.duesAutoReceiptEmail ?? true) && existing.member.email) {
    await sendDuesReceiptEmail(duesId, locale, false);
  }

  await prisma.auditLog.create({
    data: {
      clubId,
      action: "DUES_STRIPE_PAID",
      entity: "MemberDues",
      entityId: duesId,
      metadata: { receiptNumber, sessionId: session.id, stripeRef },
    },
  });

  const { dispatchDuesPaidWebhook } = await import("@/lib/club-webhooks");
  dispatchDuesPaidWebhook(clubId, {
    duesId,
    memberId: existing.memberId,
    amount: Number(existing.amount),
    currency: existing.currency,
    paymentMethod: "STRIPE",
    receiptNumber,
    paidAt: paidAt.toISOString(),
  });

  const recorderId =
    existing.member.userId ??
    (
      await prisma.clubMembership.findFirst({
        where: { clubId, isActive: true, role: { in: ["TREASURER", "ADMIN", "PRESIDENT"] } },
        select: { userId: true },
      })
    )?.userId;

  if (recorderId) {
    const { syncDuesPayment } = await import("@/actions/treasury");
    void syncDuesPayment(payment.id, clubId, recorderId);
  }

  return true;
}