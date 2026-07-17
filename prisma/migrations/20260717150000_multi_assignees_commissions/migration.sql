-- ClubAction: commission + multi assignees
ALTER TABLE "ClubAction" ADD COLUMN IF NOT EXISTS "commissionId" TEXT;
CREATE INDEX IF NOT EXISTS "ClubAction_commissionId_idx" ON "ClubAction"("commissionId");

DO $$ BEGIN
  ALTER TABLE "ClubAction" ADD CONSTRAINT "ClubAction_commissionId_fkey"
    FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClubActionAssignee" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubActionAssignee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClubActionAssignee_actionId_memberId_key"
  ON "ClubActionAssignee"("actionId", "memberId");
CREATE INDEX IF NOT EXISTS "ClubActionAssignee_memberId_idx" ON "ClubActionAssignee"("memberId");

DO $$ BEGIN
  ALTER TABLE "ClubActionAssignee" ADD CONSTRAINT "ClubActionAssignee_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "ClubAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubActionAssignee" ADD CONSTRAINT "ClubActionAssignee_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ClubProject: commission + multi assignees
ALTER TABLE "ClubProject" ADD COLUMN IF NOT EXISTS "commissionId" TEXT;
CREATE INDEX IF NOT EXISTS "ClubProject_commissionId_idx" ON "ClubProject"("commissionId");

DO $$ BEGIN
  ALTER TABLE "ClubProject" ADD CONSTRAINT "ClubProject_commissionId_fkey"
    FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClubProjectAssignee" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubProjectAssignee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClubProjectAssignee_projectId_memberId_key"
  ON "ClubProjectAssignee"("projectId", "memberId");
CREATE INDEX IF NOT EXISTS "ClubProjectAssignee_memberId_idx" ON "ClubProjectAssignee"("memberId");

DO $$ BEGIN
  ALTER TABLE "ClubProjectAssignee" ADD CONSTRAINT "ClubProjectAssignee_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClubProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubProjectAssignee" ADD CONSTRAINT "ClubProjectAssignee_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: primary responsible → assignee join
INSERT INTO "ClubActionAssignee" ("id", "actionId", "memberId", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text), a."id", a."responsibleMemberId", NOW()
FROM "ClubAction" a
WHERE a."responsibleMemberId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ClubActionAssignee" x
    WHERE x."actionId" = a."id" AND x."memberId" = a."responsibleMemberId"
  );

INSERT INTO "ClubProjectAssignee" ("id", "projectId", "memberId", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text), p."id", p."ownerMemberId", NOW()
FROM "ClubProject" p
WHERE p."ownerMemberId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ClubProjectAssignee" x
    WHERE x."projectId" = p."id" AND x."memberId" = p."ownerMemberId"
  );
