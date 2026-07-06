import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import {
  getPlanFeaturePreset,
  mergePlanFeaturesWithAddons,
} from "@/lib/plan-features";

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
  treasuryEnabled: boolean;
  treasuryMenuVisible: boolean;
  actionsEnabled: boolean;
  actionsMenuVisible: boolean;
  calendarEnabled: boolean;
  calendarMenuVisible: boolean;
  memberPortalEnabled: boolean;
  memberPortalMenuVisible: boolean;
  attendanceReportsEnabled: boolean;
  attendanceReportsMenuVisible: boolean;
  eventsEnabled: boolean;
  eventsMenuVisible: boolean;
  documentsEnabled: boolean;
  documentsMenuVisible: boolean;
  governanceEnabled: boolean;
  governanceMenuVisible: boolean;
  smartNotificationsEnabled: boolean;
  integrationsEnabled: boolean;
  integrationsMenuVisible: boolean;
  pwaEnhancedEnabled: boolean;
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
  treasuryEnabled: true,
  treasuryMenuVisible: true,
  actionsEnabled: true,
  actionsMenuVisible: true,
  calendarEnabled: true,
  calendarMenuVisible: true,
  memberPortalEnabled: true,
  memberPortalMenuVisible: true,
  attendanceReportsEnabled: true,
  attendanceReportsMenuVisible: false,
  eventsEnabled: true,
  eventsMenuVisible: true,
  documentsEnabled: true,
  documentsMenuVisible: true,
  governanceEnabled: true,
  governanceMenuVisible: false,
  smartNotificationsEnabled: true,
  integrationsEnabled: false,
  integrationsMenuVisible: false,
  pwaEnhancedEnabled: true,
  memberLimit: null,
};

function mapClubFeatures(
  features: NonNullable<Awaited<ReturnType<typeof prisma.clubFeatures.findUnique>>>
): ClubFeatureSet {
  const d = DEFAULT_FEATURES;
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
    duesEnabled: features.duesEnabled ?? d.duesEnabled,
    duesMenuVisible: features.duesMenuVisible ?? d.duesMenuVisible,
    treasuryEnabled: features.treasuryEnabled ?? d.treasuryEnabled,
    treasuryMenuVisible: features.treasuryMenuVisible ?? d.treasuryMenuVisible,
    actionsEnabled: features.actionsEnabled ?? d.actionsEnabled,
    actionsMenuVisible: features.actionsMenuVisible ?? d.actionsMenuVisible,
    calendarEnabled: features.calendarEnabled ?? d.calendarEnabled,
    calendarMenuVisible: features.calendarMenuVisible ?? d.calendarMenuVisible,
    memberPortalEnabled: features.memberPortalEnabled ?? d.memberPortalEnabled,
    memberPortalMenuVisible: features.memberPortalMenuVisible ?? d.memberPortalMenuVisible,
    attendanceReportsEnabled: features.attendanceReportsEnabled ?? d.attendanceReportsEnabled,
    attendanceReportsMenuVisible: features.attendanceReportsMenuVisible ?? d.attendanceReportsMenuVisible,
    eventsEnabled: features.eventsEnabled ?? d.eventsEnabled,
    eventsMenuVisible: features.eventsMenuVisible ?? d.eventsMenuVisible,
    documentsEnabled: features.documentsEnabled ?? d.documentsEnabled,
    documentsMenuVisible: features.documentsMenuVisible ?? d.documentsMenuVisible,
    governanceEnabled: features.governanceEnabled ?? d.governanceEnabled,
    governanceMenuVisible: features.governanceMenuVisible ?? d.governanceMenuVisible,
    smartNotificationsEnabled: features.smartNotificationsEnabled ?? d.smartNotificationsEnabled,
    integrationsEnabled: features.integrationsEnabled ?? d.integrationsEnabled,
    integrationsMenuVisible: features.integrationsMenuVisible ?? d.integrationsMenuVisible,
    pwaEnhancedEnabled: features.pwaEnhancedEnabled ?? d.pwaEnhancedEnabled,
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

/** Applique les modules selon l'offre (+ addons actifs). Le super admin peut désactiver ensuite manuellement. */
export async function syncClubFeaturesFromPlan(
  clubId: string,
  plan: SubscriptionPlan
): Promise<void> {
  try {
    const [planConfig, addons, sub] = await Promise.all([
      prisma.planConfig.findUnique({ where: { plan } }),
      prisma.clubAddon.findMany({
        where: {
          clubId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { addonKey: true },
      }),
      prisma.subscription.findUnique({
        where: { clubId },
        select: { status: true },
      }),
    ]);

    const effectivePlan =
      plan === "TRIAL" && sub?.status === "TRIALING" ? "TRIAL" : plan;

    let preset = getPlanFeaturePreset(effectivePlan);
    if (planConfig?.memberLimit != null) {
      preset = { ...preset, memberLimit: planConfig.memberLimit };
    }

    const merged = mergePlanFeaturesWithAddons(
      preset,
      addons.map((a) => a.addonKey)
    );

    await prisma.clubFeatures.upsert({
      where: { clubId },
      update: merged,
      create: { clubId, ...merged },
    });
  } catch (e) {
    console.error("[syncClubFeaturesFromPlan] failed:", e);
  }
}