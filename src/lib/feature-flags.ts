import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export interface FeatureFlagData {
  key: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  defaultEnabled: boolean;
  rolloutPercent: number;
  isActive: boolean;
}

const DEFAULT_FLAGS: FeatureFlagData[] = [
  {
    key: "beta_minute_assist",
    nameFr: "Aide à la rédaction (bêta)",
    nameEn: "Writing assist (beta)",
    descriptionFr: "Suggestions avancées dans l'éditeur de PV",
    descriptionEn: "Advanced suggestions in the minutes editor",
    defaultEnabled: false,
    rolloutPercent: 0,
    isActive: true,
  },
  {
    key: "enhanced_statistics",
    nameFr: "Statistiques enrichies",
    nameEn: "Enhanced statistics",
    descriptionFr: "Graphiques et benchmarks détaillés",
    descriptionEn: "Detailed charts and benchmarks",
    defaultEnabled: false,
    rolloutPercent: 25,
    isActive: true,
  },
  {
    key: "email_campaign_v2",
    nameFr: "Composeur email v2",
    nameEn: "Email composer v2",
    descriptionFr: "Nouvelle interface de composition des campagnes",
    descriptionEn: "New campaign composer interface",
    defaultEnabled: false,
    rolloutPercent: 0,
    isActive: true,
  },
];

function rolloutBucket(clubId: string, flagKey: string): number {
  let hash = 0;
  const input = `${clubId}:${flagKey}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export async function ensureFeatureFlags(
  db: Pick<PrismaClient, "featureFlag"> = prisma
): Promise<void> {
  for (const flag of DEFAULT_FLAGS) {
    await db.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
}

export async function isFeatureEnabled(
  clubId: string,
  flagKey: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } });
  if (!flag?.isActive) return false;

  const override = await prisma.clubFeatureFlagOverride.findUnique({
    where: { clubId_flagKey: { clubId, flagKey } },
  });
  if (override) return override.enabled;

  if (flag.defaultEnabled) return true;
  if (flag.rolloutPercent > 0) {
    return rolloutBucket(clubId, flagKey) < flag.rolloutPercent;
  }

  return false;
}

export async function getClubFeatureFlags(clubId: string): Promise<
  Record<string, boolean>
> {
  await ensureFeatureFlags();
  const flags = await prisma.featureFlag.findMany({
    where: { isActive: true },
    orderBy: { key: "asc" },
  });

  const overrides = await prisma.clubFeatureFlagOverride.findMany({
    where: { clubId },
  });
  const overrideMap = new Map(overrides.map((o) => [o.flagKey, o.enabled]));

  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    if (overrideMap.has(flag.key)) {
      result[flag.key] = overrideMap.get(flag.key)!;
    } else if (flag.defaultEnabled) {
      result[flag.key] = true;
    } else if (flag.rolloutPercent > 0) {
      result[flag.key] = rolloutBucket(clubId, flag.key) < flag.rolloutPercent;
    } else {
      result[flag.key] = false;
    }
  }
  return result;
}