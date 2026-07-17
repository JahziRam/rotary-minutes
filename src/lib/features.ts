import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { AddonKey, SubscriptionPlan } from "@/generated/prisma/client";
import {
  getPlanFeaturePreset,
  mergePlanFeaturesWithAddons,
} from "@/lib/plan-features";
import {
  type ClubFeatureSet,
  CLUB_FEATURE_KEYS,
  CLUB_FEATURE_LABELS,
  DEFAULT_FEATURES,
} from "@/lib/feature-definitions";

export type { ClubFeatureSet };
export { CLUB_FEATURE_KEYS, CLUB_FEATURE_LABELS, DEFAULT_FEATURES };

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
    eventsAdvancedEnabled: features.eventsAdvancedEnabled ?? d.eventsAdvancedEnabled,
    eventsAdvancedMenuVisible: features.eventsAdvancedMenuVisible ?? d.eventsAdvancedMenuVisible,
    fileManagerEnabled: features.fileManagerEnabled ?? d.fileManagerEnabled,
    fileManagerMenuVisible: features.fileManagerMenuVisible ?? d.fileManagerMenuVisible,
    documentSharingEnabled: features.documentSharingEnabled ?? d.documentSharingEnabled,
    treasuryImportEnabled: features.treasuryImportEnabled ?? d.treasuryImportEnabled,
    clubBackupEnabled: features.clubBackupEnabled ?? d.clubBackupEnabled,
    minuteAiAssistEnabled: features.minuteAiAssistEnabled ?? d.minuteAiAssistEnabled,
    projectsEnabled: features.projectsEnabled ?? d.projectsEnabled,
    projectsMenuVisible: features.projectsMenuVisible ?? d.projectsMenuVisible,
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

export async function getPlatformDefaultClubFeatures(): Promise<ClubFeatureSet> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
    const overrides = (
      settings?.config as { defaultClubFeatures?: Partial<ClubFeatureSet> } | null
    )?.defaultClubFeatures;
    return { ...DEFAULT_FEATURES, ...overrides };
  } catch {
    return DEFAULT_FEATURES;
  }
}

export async function ensureClubFeatures(clubId: string) {
  try {
    const defaults = await getPlatformDefaultClubFeatures();
    return await prisma.clubFeatures.upsert({
      where: { clubId },
      update: {},
      create: { clubId, ...defaults },
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
    const [planConfig, sub] = await Promise.all([
      prisma.planConfig.findUnique({ where: { plan } }),
      prisma.subscription.findUnique({
        where: { clubId },
        select: { status: true },
      }),
    ]);

    let addons: { addonKey: AddonKey }[] = [];
    try {
      addons = await prisma.clubAddon.findMany({
        where: {
          clubId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { addonKey: true },
      });
    } catch (addonErr) {
      console.error("[syncClubFeaturesFromPlan] clubAddon query failed:", addonErr);
    }

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