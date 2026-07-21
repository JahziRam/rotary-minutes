-- Spouse / partner (conjoint / lady) on member profile
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "spouseFirstName" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "spouseLastName" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "spouseBirthday" TIMESTAMP(3);
