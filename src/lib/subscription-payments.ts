import { prisma } from "@/lib/prisma";
import type {
  BillingInterval,
  Prisma,
  SubscriptionPaymentKind,
  SubscriptionPlan,
} from "@/generated/prisma/client";

export type RecordSubscriptionPaymentInput = {
  clubId: string;
  subscriptionId?: string | null;
  kind: SubscriptionPaymentKind;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeSessionId?: string | null;
  amountCents: number;
  currency: string;
  status: string;
  plan?: SubscriptionPlan | null;
  billingInterval?: BillingInterval | null;
  paidAt?: Date;
  metadata?: Prisma.InputJsonValue;
};

export async function recordSubscriptionPayment(
  input: RecordSubscriptionPaymentInput
): Promise<void> {
  if (input.amountCents <= 0) return;

  const data = {
    clubId: input.clubId,
    subscriptionId: input.subscriptionId ?? null,
    kind: input.kind,
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    stripeSessionId: input.stripeSessionId ?? null,
    amountCents: input.amountCents,
    currency: input.currency.toUpperCase(),
    status: input.status,
    plan: input.plan ?? null,
    billingInterval: input.billingInterval ?? null,
    paidAt: input.paidAt ?? new Date(),
    metadata: input.metadata ?? undefined,
  };

  if (input.stripeInvoiceId) {
    await prisma.subscriptionPayment.upsert({
      where: { stripeInvoiceId: input.stripeInvoiceId },
      create: { ...data, stripeInvoiceId: input.stripeInvoiceId },
      update: {
        status: input.status,
        amountCents: input.amountCents,
        paidAt: input.paidAt ?? new Date(),
        metadata: input.metadata ?? undefined,
      },
    });
    return;
  }

  if (input.stripeSessionId) {
    const existing = await prisma.subscriptionPayment.findFirst({
      where: { stripeSessionId: input.stripeSessionId },
    });
    if (existing) {
      await prisma.subscriptionPayment.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          amountCents: input.amountCents,
          paidAt: input.paidAt ?? new Date(),
          metadata: input.metadata ?? undefined,
        },
      });
      return;
    }
  }

  await prisma.subscriptionPayment.create({
    data: {
      ...data,
      stripeInvoiceId: input.stripeInvoiceId ?? null,
    },
  });
}