import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface ClubFeatureSet {
  emailsEnabled: boolean;
  statisticsEnabled: boolean;
  districtDashboard: boolean;
  pdfExport: boolean;
  offlineMode: boolean;
  liveMeetings: boolean;
  emailsMenuVisible: boolean;
  statisticsMenuVisible: boolean;
  pdfMenuVisible: boolean;
  liveMeetingsMenuVisible: boolean;
  districtMenuVisible: boolean;
  offlineMenuVisible: boolean;
  apiAccessEnabled: boolean;
  duesEnabled: boolean;
  duesMenuVisible: boolean;
  memberLimit: number | null;
}

export const DEFAULT_FEATURES: ClubFeatureSet = {
  emailsEnabled: true,
  statisticsEnabled: true,
  districtDashboard: false,
  pdfExport: true,
  offlineMode: false,
  liveMeetings: true,
  emailsMenuVisible: false,
  statisticsMenuVisible: false,
  pdfMenuVisible: false,
  liveMeetingsMenuVisible: false,
  districtMenuVisible: false,
  offlineMenuVisible: false,
  apiAccessEnabled: false,
  duesEnabled: true,
  duesMenuVisible: true,
  memberLimit: null,
};

function mapClubFeatures(
  features: NonNullable<Awaited<ReturnType<typeof prisma.clubFeatures.findUnique>>>
): ClubFeatureSet {
  return {
    emailsEnabled: features.emailsEnabled,
    statisticsEnabled: features.statisticsEnabled,
    districtDashboard: features.districtDashboard,
    pdfExport: features.pdfExport,
    offlineMode: features.offlineMode,
    liveMeetings: features.liveMeetings,
    emailsMenuVisible: features.emailsMenuVisible,
    statisticsMenuVisible: features.statisticsMenuVisible,
    pdfMenuVisible: features.pdfMenuVisible,
    liveMeetingsMenuVisible: features.liveMeetingsMenuVisible,
    districtMenuVisible: features.districtMenuVisible,
    offlineMenuVisible: features.offlineMenuVisible,
    apiAccessEnabled: features.apiAccessEnabled,
    duesEnabled: features.duesEnabled ?? DEFAULT_FEATURES.duesEnabled,
    duesMenuVisible: features.duesMenuVisible ?? DEFAULT_FEATURES.duesMenuVisible,
    memberLimit: features.memberLimit,
  };
}

export const getClubFeatures = cache(async (clubId: string): Promise<ClubFeatureSet> => {
  if (!prisma.clubFeatures) return DEFAULT_FEATURES;
  try {
    const features = await prisma.clubFeatures.findUnique({ where: { clubId } });
    if (!features) return DEFAULT_FEATURES;
    return mapClubFeatures(features);
  } catch (e) {
    console.error("[getClubFeatures] schema mismatch, using defaults:", e);
    return DEFAULT_FEATURES;
  }
});

export async function ensureClubFeatures(clubId: string) {
  try {
    return await prisma.clubFeatures.upsert({
      where: { clubId },
      update: {},
      create: { clubId, ...DEFAULT_FEATURES },
    });
  } catch (e) {
    console.error("[ensureClubFeatures] upsert failed:", e);
    return null;
  }
}