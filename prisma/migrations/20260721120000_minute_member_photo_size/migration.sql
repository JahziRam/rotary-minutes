-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MinuteMemberPhotoSize" AS ENUM ('S', 'M', 'L');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "minuteMemberPhotoSize" "MinuteMemberPhotoSize" NOT NULL DEFAULT 'S';
