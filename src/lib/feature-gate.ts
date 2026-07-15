import type { ClubFeatureSet } from "@/lib/features";

export type GatedFeature = keyof Pick<
  ClubFeatureSet,
  | "emailsEnabled"
  | "statisticsEnabled"
  | "districtDashboard"
  | "pdfExport"
  | "offlineMode"
  | "liveMeetings"
  | "duesEnabled"
  | "treasuryEnabled"
  | "actionsEnabled"
  | "calendarEnabled"
  | "memberPortalEnabled"
  | "attendanceReportsEnabled"
  | "eventsEnabled"
  | "documentsEnabled"
  | "governanceEnabled"
  | "smartNotificationsEnabled"
  | "integrationsEnabled"
  | "pwaEnhancedEnabled"
  | "eventsAdvancedEnabled"
  | "fileManagerEnabled"
  | "documentSharingEnabled"
  | "treasuryImportEnabled"
  | "clubBackupEnabled"
>;

export const GATED_FEATURE_KEYS: GatedFeature[] = [
  "emailsEnabled",
  "statisticsEnabled",
  "liveMeetings",
  "pdfExport",
  "districtDashboard",
  "offlineMode",
  "duesEnabled",
  "treasuryEnabled",
  "actionsEnabled",
  "calendarEnabled",
  "memberPortalEnabled",
  "attendanceReportsEnabled",
  "eventsEnabled",
  "documentsEnabled",
  "governanceEnabled",
  "smartNotificationsEnabled",
  "integrationsEnabled",
  "pwaEnhancedEnabled",
  "eventsAdvancedEnabled",
  "fileManagerEnabled",
  "documentSharingEnabled",
  "treasuryImportEnabled",
  "clubBackupEnabled",
];

export function isFeatureEnabled(
  features: ClubFeatureSet,
  feature: GatedFeature,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  return !!features[feature];
}

const FEATURE_MENU_VISIBLE: Partial<Record<GatedFeature, keyof ClubFeatureSet>> = {
  emailsEnabled: "emailsMenuVisible",
  statisticsEnabled: "statisticsMenuVisible",
  pdfExport: "pdfMenuVisible",
  liveMeetings: "liveMeetingsMenuVisible",
  districtDashboard: "districtMenuVisible",
  offlineMode: "offlineMenuVisible",
  duesEnabled: "duesMenuVisible",
  treasuryEnabled: "treasuryMenuVisible",
  actionsEnabled: "actionsMenuVisible",
  calendarEnabled: "calendarMenuVisible",
  memberPortalEnabled: "memberPortalMenuVisible",
  attendanceReportsEnabled: "attendanceReportsMenuVisible",
  eventsEnabled: "eventsMenuVisible",
  documentsEnabled: "documentsMenuVisible",
  governanceEnabled: "governanceMenuVisible",
  integrationsEnabled: "integrationsMenuVisible",
  eventsAdvancedEnabled: "eventsAdvancedMenuVisible",
  fileManagerEnabled: "fileManagerMenuVisible",
};

export function isFeatureVisibleInUi(
  features: ClubFeatureSet,
  feature: GatedFeature,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (isFeatureEnabled(features, feature, false)) return true;
  const menuKey = FEATURE_MENU_VISIBLE[feature];
  return menuKey ? !!features[menuKey] : false;
}

import { localizedPlanName } from "@/lib/plans-utils";

/** Fallback si les libellés DB ne sont pas disponibles (composants client). */
export const PLAN_DISPLAY_LABELS: Record<string, { fr: string; en: string }> = {
  TRIAL: { fr: "Essai gratuit", en: "Free trial" },
  STARTER: { fr: "Starter", en: "Starter" },
  PROFESSIONAL: { fr: "Active", en: "Active" },
  ENTERPRISE: { fr: "High level", en: "High level" },
};

export function getPlanLabel(
  plan: string | undefined,
  locale: string,
  labels?: Record<string, string>
): string {
  if (labels) return localizedPlanName(plan, locale, labels);
  const key = plan ?? "TRIAL";
  const localeKey = locale === "fr" ? "fr" : "en";
  return PLAN_DISPLAY_LABELS[key]?.[localeKey] ?? key;
}