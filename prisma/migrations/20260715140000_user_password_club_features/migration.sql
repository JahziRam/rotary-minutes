-- Mot de passe temporaire : changement obligatoire à la première connexion
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Annonces club : ciblage enrichi
DO $$ BEGIN
  CREATE TYPE "ClubAnnouncementTarget" AS ENUM (
    'ALL_MEMBERS',
    'ROLES',
    'COMMISSION',
    'DUES_OVERDUE',
    'DUES_PENDING',
    'NO_APP_ACCOUNT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClubAnnouncement" ADD COLUMN IF NOT EXISTS "targetType" "ClubAnnouncementTarget" NOT NULL DEFAULT 'ROLES';
ALTER TABLE "ClubAnnouncement" ADD COLUMN IF NOT EXISTS "targetCommissionId" TEXT;