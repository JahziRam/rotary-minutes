-- CreateEnum
CREATE TYPE "BudgetDocumentKind" AS ENUM ('QUOTE', 'PROFORMA', 'PURCHASE_ORDER', 'CONTRACT', 'ESTIMATE', 'INVOICE', 'OTHER');

-- ClubProject budget fields
ALTER TABLE "ClubProject" ADD COLUMN IF NOT EXISTS "budgetPlanned" DECIMAL(12,2);
ALTER TABLE "ClubProject" ADD COLUMN IF NOT EXISTS "budgetNotes" TEXT;

-- ClubEvent budget fields
ALTER TABLE "ClubEvent" ADD COLUMN IF NOT EXISTS "budgetPlanned" DECIMAL(12,2);
ALTER TABLE "ClubEvent" ADD COLUMN IF NOT EXISTS "budgetNotes" TEXT;

-- BudgetEntry project link
ALTER TABLE "BudgetEntry" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "BudgetEntry_projectId_idx" ON "BudgetEntry"("projectId");

DO $$ BEGIN
  ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClubProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- BudgetDocument
CREATE TABLE IF NOT EXISTS "BudgetDocument" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "kind" "BudgetDocumentKind" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "projectId" TEXT,
    "eventId" TEXT,
    "actionId" TEXT,
    "mandateYear" INTEGER,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BudgetDocument_clubId_projectId_idx" ON "BudgetDocument"("clubId", "projectId");
CREATE INDEX IF NOT EXISTS "BudgetDocument_clubId_eventId_idx" ON "BudgetDocument"("clubId", "eventId");
CREATE INDEX IF NOT EXISTS "BudgetDocument_clubId_mandateYear_idx" ON "BudgetDocument"("clubId", "mandateYear");

DO $$ BEGIN
  ALTER TABLE "BudgetDocument" ADD CONSTRAINT "BudgetDocument_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetDocument" ADD CONSTRAINT "BudgetDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetDocument" ADD CONSTRAINT "BudgetDocument_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetDocument" ADD CONSTRAINT "BudgetDocument_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "ClubAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetDocument" ADD CONSTRAINT "BudgetDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
