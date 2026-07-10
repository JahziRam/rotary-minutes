-- CreateEnum
CREATE TYPE "SubscriptionPaymentKind" AS ENUM ('CHECKOUT', 'INVOICE', 'REFUND');

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "kind" "SubscriptionPaymentKind" NOT NULL DEFAULT 'INVOICE',
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "plan" "SubscriptionPlan",
    "billingInterval" "BillingInterval",
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_stripeInvoiceId_key" ON "SubscriptionPayment"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_clubId_paidAt_idx" ON "SubscriptionPayment"("clubId", "paidAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_paidAt_idx" ON "SubscriptionPayment"("paidAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;