-- Notifications push activées par défaut ; chaque membre peut désactiver dans son profil
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "webPushEnabled" BOOLEAN NOT NULL DEFAULT true;