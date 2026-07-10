-- CreateEnum
CREATE TYPE "TreasuryVoucherKind" AS ENUM ('INVOICE', 'RECEIPT', 'PAYMENT_PROOF', 'BANK_STATEMENT', 'CONTRACT', 'OTHER');

-- CreateTable
CREATE TABLE "TreasuryVoucher" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "kind" "TreasuryVoucherKind" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "budgetEntryId" TEXT,
    "duesPaymentId" TEXT,
    "eventRegistrationId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreasuryVoucher_clubId_budgetEntryId_idx" ON "TreasuryVoucher"("clubId", "budgetEntryId");

-- CreateIndex
CREATE INDEX "TreasuryVoucher_clubId_duesPaymentId_idx" ON "TreasuryVoucher"("clubId", "duesPaymentId");

-- CreateIndex
CREATE INDEX "TreasuryVoucher_clubId_eventRegistrationId_idx" ON "TreasuryVoucher"("clubId", "eventRegistrationId");

-- AddForeignKey
ALTER TABLE "TreasuryVoucher" ADD CONSTRAINT "TreasuryVoucher_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryVoucher" ADD CONSTRAINT "TreasuryVoucher_budgetEntryId_fkey" FOREIGN KEY ("budgetEntryId") REFERENCES "BudgetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryVoucher" ADD CONSTRAINT "TreasuryVoucher_duesPaymentId_fkey" FOREIGN KEY ("duesPaymentId") REFERENCES "DuesPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryVoucher" ADD CONSTRAINT "TreasuryVoucher_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryVoucher" ADD CONSTRAINT "TreasuryVoucher_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;