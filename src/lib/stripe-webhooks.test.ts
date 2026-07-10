import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { prismaMock, activateMock, recordPaymentMock } = vi.hoisted(() => ({
  prismaMock: {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
  activateMock: vi.fn(),
  recordPaymentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe-checkout", () => ({
  activateSubscriptionFromStripe: activateMock,
  mapStripeSubscriptionStatus: (s: string) => s,
}));
vi.mock("@/lib/subscription-payments", () => ({
  recordSubscriptionPayment: recordPaymentMock,
}));

import {
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
} from "./stripe-webhooks";

describe("stripe webhooks payment logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.subscription.findUnique.mockResolvedValue({ id: "sub_1" });
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: "sub_1",
      clubId: "club_1",
      plan: "PROFESSIONAL",
      billingInterval: "MONTHLY",
    });
    prismaMock.subscription.update.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});
    activateMock.mockResolvedValue(undefined);
    recordPaymentMock.mockResolvedValue(undefined);
  });

  it("records checkout payment when amount is present", async () => {
    await handleCheckoutSessionCompleted({
      id: "cs_1",
      metadata: {
        clubId: "club_1",
        planKey: "PROFESSIONAL",
        billingInterval: "MONTHLY",
      },
      amount_total: 4900,
      currency: "eur",
      payment_status: "paid",
      mode: "subscription",
    } as Stripe.Checkout.Session);

    expect(recordPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        kind: "CHECKOUT",
        stripeSessionId: "cs_1",
        amountCents: 4900,
        currency: "EUR",
      })
    );
  });

  it("records invoice payment on invoice.paid", async () => {
    await handleInvoicePaid({
      id: "in_1",
      subscription: "sub_stripe_1",
      amount_paid: 3900,
      currency: "eur",
      status: "paid",
      payment_intent: "pi_1",
      lines: { data: [{ period: { end: 1_700_000_000 } }] },
      status_transitions: { paid_at: 1_699_000_000 },
    } as Stripe.Invoice);

    expect(recordPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        kind: "INVOICE",
        stripeInvoiceId: "in_1",
        amountCents: 3900,
      })
    );
  });

  it("skips checkout logging when amount is zero", async () => {
    await handleCheckoutSessionCompleted({
      id: "cs_free",
      metadata: {
        clubId: "club_1",
        planKey: "TRIAL",
        billingInterval: "MONTHLY",
      },
      amount_total: 0,
      currency: "eur",
      payment_status: "paid",
    } as Stripe.Checkout.Session);

    expect(recordPaymentMock).not.toHaveBeenCalled();
  });
});