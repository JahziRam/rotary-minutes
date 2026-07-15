-- AlterEnum
ALTER TYPE "AddonKey" ADD VALUE 'MINUTE_AI';

-- AlterTable
ALTER TABLE "ClubFeatures" ADD COLUMN "minuteAiAssistEnabled" BOOLEAN NOT NULL DEFAULT false;