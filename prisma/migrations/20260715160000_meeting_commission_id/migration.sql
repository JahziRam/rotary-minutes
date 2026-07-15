ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "commissionId" TEXT;

CREATE INDEX IF NOT EXISTS "Meeting_clubId_commissionId_idx" ON "Meeting"("clubId", "commissionId");