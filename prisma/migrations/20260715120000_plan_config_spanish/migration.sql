-- Champs espagnols pour les offres (PlanConfig)
ALTER TABLE "PlanConfig" ADD COLUMN IF NOT EXISTS "nameEs" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanConfig" ADD COLUMN IF NOT EXISTS "descriptionEs" TEXT;
ALTER TABLE "PlanConfig" ADD COLUMN IF NOT EXISTS "featuresEs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];