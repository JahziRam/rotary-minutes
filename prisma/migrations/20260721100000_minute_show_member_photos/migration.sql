-- Club preference: show member profile photos in PV annex
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "minuteShowMemberPhotos" BOOLEAN NOT NULL DEFAULT false;
