-- CreateEnum
CREATE TYPE "CommissionMemberRole" AS ENUM ('CHAIR', 'MEMBER');

-- Commission multi-membership
CREATE TABLE IF NOT EXISTS "CommissionMembership" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "CommissionMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionMembership_commissionId_memberId_key"
  ON "CommissionMembership"("commissionId", "memberId");
CREATE INDEX IF NOT EXISTS "CommissionMembership_memberId_idx" ON "CommissionMembership"("memberId");
CREATE INDEX IF NOT EXISTS "CommissionMembership_commissionId_role_idx" ON "CommissionMembership"("commissionId", "role");

DO $$ BEGIN
  ALTER TABLE "CommissionMembership" ADD CONSTRAINT "CommissionMembership_commissionId_fkey"
    FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommissionMembership" ADD CONSTRAINT "CommissionMembership_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill from Member.commissionId
INSERT INTO "CommissionMembership" ("id", "commissionId", "memberId", "role", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text), m."commissionId", m."id", 'MEMBER', NOW()
FROM "Member" m
WHERE m."commissionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CommissionMembership" cm
    WHERE cm."commissionId" = m."commissionId" AND cm."memberId" = m."id"
  );

-- Promote chairName matches to CHAIR when possible (best-effort, skip if ambiguous)
UPDATE "CommissionMembership" cm
SET "role" = 'CHAIR'
FROM "Commission" c, "Member" m
WHERE cm."commissionId" = c."id"
  AND cm."memberId" = m."id"
  AND c."chairName" IS NOT NULL
  AND (
    lower(trim(c."chairName")) = lower(trim(m."firstName" || ' ' || m."lastName"))
    OR lower(trim(c."chairName")) = lower(trim(m."lastName" || ' ' || m."firstName"))
  );

-- Project activity log
CREATE TABLE IF NOT EXISTS "ProjectActivityLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectActivityLog_projectId_createdAt_idx"
  ON "ProjectActivityLog"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProjectActivityLog_clubId_createdAt_idx"
  ON "ProjectActivityLog"("clubId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ProjectActivityLog" ADD CONSTRAINT "ProjectActivityLog_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectActivityLog" ADD CONSTRAINT "ProjectActivityLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
