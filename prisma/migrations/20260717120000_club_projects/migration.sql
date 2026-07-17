-- CreateEnum
CREATE TYPE "ClubProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- AlterTable ClubFeatures
ALTER TABLE "ClubFeatures" ADD COLUMN IF NOT EXISTS "projectsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClubFeatures" ADD COLUMN IF NOT EXISTS "projectsMenuVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable ClubProject
CREATE TABLE IF NOT EXISTS "ClubProject" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ClubProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "ownerMemberId" TEXT,
    "color" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubProject_pkey" PRIMARY KEY ("id")
);

-- AlterTable ClubAction
ALTER TABLE "ClubAction" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "ClubProject_clubId_status_idx" ON "ClubProject"("clubId", "status");
CREATE INDEX IF NOT EXISTS "ClubProject_clubId_endDate_idx" ON "ClubProject"("clubId", "endDate");
CREATE INDEX IF NOT EXISTS "ClubProject_ownerMemberId_idx" ON "ClubProject"("ownerMemberId");
CREATE INDEX IF NOT EXISTS "ClubAction_projectId_idx" ON "ClubAction"("projectId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "ClubProject" ADD CONSTRAINT "ClubProject_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubProject" ADD CONSTRAINT "ClubProject_ownerMemberId_fkey"
    FOREIGN KEY ("ownerMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubProject" ADD CONSTRAINT "ClubProject_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubAction" ADD CONSTRAINT "ClubAction_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClubProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
