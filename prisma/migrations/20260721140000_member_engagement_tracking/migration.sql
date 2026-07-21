-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MinuteView" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "minuteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinuteView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MinuteView_minuteId_userId_key" ON "MinuteView"("minuteId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MinuteView_clubId_viewedAt_idx" ON "MinuteView"("clubId", "viewedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MinuteView_userId_viewedAt_idx" ON "MinuteView"("userId", "viewedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MinuteView" ADD CONSTRAINT "MinuteView_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MinuteView" ADD CONSTRAINT "MinuteView_minuteId_fkey"
    FOREIGN KEY ("minuteId") REFERENCES "Minute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MinuteView" ADD CONSTRAINT "MinuteView_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
