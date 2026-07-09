import type { SubscriptionPlan } from "@/generated/prisma/client";
import type { ClubFeatureSet } from "@/lib/features";
import type { AddonKey } from "@/generated/prisma/client";

/** Presets appliqués automatiquement à chaque changement d'offre (super admin peut désactiver ensuite). */
export function getPlanFeaturePreset(plan: SubscriptionPlan): ClubFeatureSet {
  const base: ClubFeatureSet = {
    emailsEnabled: false,
    statisticsEnabled: false,
    districtDashboard: false,
    pdfExport: true,
    offlineMode: false,
    liveMeetings: true,
    emailsMenuVisible: false,
    statisticsMenuVisible: false,
    pdfMenuVisible: true,
    liveMeetingsMenuVisible: true,
    districtMenuVisible: false,
    offlineMenuVisible: false,
    apiAccessEnabled: false,
    duesEnabled: true,
    duesMenuVisible: true,
    treasuryEnabled: false,
    treasuryMenuVisible: false,
    actionsEnabled: true,
    actionsMenuVisible: true,
    calendarEnabled: true,
    calendarMenuVisible: true,
    memberPortalEnabled: true,
    memberPortalMenuVisible: true,
    attendanceReportsEnabled: false,
    attendanceReportsMenuVisible: false,
    eventsEnabled: false,
    eventsMenuVisible: false,
    documentsEnabled: true,
    documentsMenuVisible: true,
    governanceEnabled: false,
    governanceMenuVisible: false,
    smartNotificationsEnabled: true,
    integrationsEnabled: false,
    integrationsMenuVisible: false,
    pwaEnhancedEnabled: false,
    eventsAdvancedEnabled: false,
    eventsAdvancedMenuVisible: false,
    fileManagerEnabled: false,
    fileManagerMenuVisible: false,
    documentSharingEnabled: false,
    treasuryImportEnabled: false,
    clubBackupEnabled: false,
    memberLimit: null,
  };

  switch (plan) {
    case "STARTER":
      return { ...base, memberLimit: 30 };
    case "TRIAL":
    case "PROFESSIONAL":
      return {
        ...base,
        emailsEnabled: true,
        emailsMenuVisible: true,
        statisticsEnabled: true,
        statisticsMenuVisible: true,
        treasuryEnabled: true,
        treasuryMenuVisible: true,
        attendanceReportsEnabled: true,
        attendanceReportsMenuVisible: true,
        eventsEnabled: true,
        eventsMenuVisible: true,
        eventsAdvancedEnabled: true,
        eventsAdvancedMenuVisible: true,
        fileManagerEnabled: true,
        fileManagerMenuVisible: true,
        documentSharingEnabled: true,
        treasuryImportEnabled: true,
        pwaEnhancedEnabled: true,
        memberLimit: null,
      };
    case "ENTERPRISE":
      return {
        ...base,
        emailsEnabled: true,
        emailsMenuVisible: true,
        statisticsEnabled: true,
        statisticsMenuVisible: true,
        districtDashboard: true,
        districtMenuVisible: true,
        offlineMode: true,
        offlineMenuVisible: true,
        apiAccessEnabled: true,
        treasuryEnabled: true,
        treasuryMenuVisible: true,
        attendanceReportsEnabled: true,
        attendanceReportsMenuVisible: true,
        eventsEnabled: true,
        eventsMenuVisible: true,
        governanceEnabled: true,
        governanceMenuVisible: true,
        integrationsEnabled: true,
        integrationsMenuVisible: true,
        eventsAdvancedEnabled: true,
        eventsAdvancedMenuVisible: true,
        fileManagerEnabled: true,
        fileManagerMenuVisible: true,
        documentSharingEnabled: true,
        treasuryImportEnabled: true,
        clubBackupEnabled: true,
        pwaEnhancedEnabled: true,
        memberLimit: null,
      };
    default:
      return base;
  }
}

const ADDON_FLAGS: Record<
  AddonKey,
  Partial<ClubFeatureSet>
> = {
  EMAILS: { emailsEnabled: true, emailsMenuVisible: true },
  DISTRICT: { districtDashboard: true, districtMenuVisible: true },
  ADVANCED_STATS: { statisticsEnabled: true, statisticsMenuVisible: true },
};

export function mergePlanFeaturesWithAddons(
  preset: ClubFeatureSet,
  activeAddons: AddonKey[]
): ClubFeatureSet {
  let merged = { ...preset };
  for (const key of activeAddons) {
    const patch = ADDON_FLAGS[key];
    if (patch) merged = { ...merged, ...patch };
  }
  return merged;
}