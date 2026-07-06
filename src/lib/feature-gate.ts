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

export function getPlanLabel(plan: string | undefined, locale: string): string {
  const labels: Record<string, { fr: string; en: string }> = {
    TRIAL: { fr: "Essai gratuit", en: "Free trial" },
    STARTER: { fr: "Starter", en: "Starter" },
    PROFESSIONAL: { fr: "Professional", en: "Professional" },
    ENTERPRISE: { fr: "Enterprise", en: "Enterprise" },
  };
  const key = plan ?? "TRIAL";
  return labels[key]?.[locale === "fr" ? "fr" : "en"] ?? key;
}