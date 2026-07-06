import { hasPermission, type Permission } from "@/lib/permissions";
import type { ClubFeatureSet } from "@/lib/features";
import type { ClubRoleType } from "@/lib/rotary";

const NAV_PERMISSIONS: Record<string, Permission | null> = {
  dashboard: null,
  notifications: null,
  meetings: "minutes.view",
  minutes: "minutes.view",
  emails: "emails.send",
  members: "members.manage",
  dues: "dues.view",
  treasury: "treasury.view",
  actions: "actions.view",
  calendar: "calendar.view",
  myAccount: null,
  attendanceReports: "attendance.view",
  events: "events.view",
  documents: "documents.view",
  governance: "governance.view",
  statistics: "minutes.view",
  district: "minutes.view",
  settings: "settings.manage",
};

const NAV_FEATURES: Partial<
  Record<string, { enabled: keyof ClubFeatureSet; menuVisible: keyof ClubFeatureSet }>
> = {
  emails: { enabled: "emailsEnabled", menuVisible: "emailsMenuVisible" },
  statistics: { enabled: "statisticsEnabled", menuVisible: "statisticsMenuVisible" },
  district: { enabled: "districtDashboard", menuVisible: "districtMenuVisible" },
  dues: { enabled: "duesEnabled", menuVisible: "duesMenuVisible" },
  treasury: { enabled: "treasuryEnabled", menuVisible: "treasuryMenuVisible" },
  actions: { enabled: "actionsEnabled", menuVisible: "actionsMenuVisible" },
  calendar: { enabled: "calendarEnabled", menuVisible: "calendarMenuVisible" },
  myAccount: { enabled: "memberPortalEnabled", menuVisible: "memberPortalMenuVisible" },
  attendanceReports: { enabled: "attendanceReportsEnabled", menuVisible: "attendanceReportsMenuVisible" },
  events: { enabled: "eventsEnabled", menuVisible: "eventsMenuVisible" },
  documents: { enabled: "documentsEnabled", menuVisible: "documentsMenuVisible" },
  governance: { enabled: "governanceEnabled", menuVisible: "governanceMenuVisible" },
};

export const ROUTE_FEATURES: Record<string, keyof ClubFeatureSet> = {
  "/emails": "emailsEnabled",
  "/statistics": "statisticsEnabled",
  "/meetings": "liveMeetings",
  "/district": "districtDashboard",
  "/members/dues": "duesEnabled",
  "/treasury": "treasuryEnabled",
  "/actions": "actionsEnabled",
  "/calendar": "calendarEnabled",
  "/my-account": "memberPortalEnabled",
  "/attendance-reports": "attendanceReportsEnabled",
  "/events": "eventsEnabled",
  "/documents": "documentsEnabled",
  "/governance": "governanceEnabled",
};

export function shouldShowDistrictNav(
  hasDistrictAccess: boolean,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin || hasDistrictAccess) return true;
  return features.districtDashboard || features.districtMenuVisible;
}

export function isDistrictNavLocked(
  hasDistrictAccess: boolean,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin || hasDistrictAccess) return false;
  return !features.districtDashboard && features.districtMenuVisible;
}

export function getHiddenNavKeys(
  role: ClubRoleType,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): string[] {
  if (isSuperAdmin) return [];

  const hidden: string[] = [];
  for (const [key, permission] of Object.entries(NAV_PERMISSIONS)) {
    const featureConfig = NAV_FEATURES[key];
    if (featureConfig && !features[featureConfig.enabled]) {
      if (!features[featureConfig.menuVisible]) {
        hidden.push(key);
      }
      continue;
    }
    if (permission && !hasPermission(role, permission, false)) {
      hidden.push(key);
    }
  }
  return hidden;
}

export function getLockedNavKeys(
  role: ClubRoleType,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): string[] {
  if (isSuperAdmin) return [];

  const locked: string[] = [];
  for (const [key, permission] of Object.entries(NAV_PERMISSIONS)) {
    const featureConfig = NAV_FEATURES[key];
    if (!featureConfig) continue;
    if (!features[featureConfig.enabled] && features[featureConfig.menuVisible]) {
      if (!permission || hasPermission(role, permission, false)) {
        locked.push(key);
      }
    }
  }
  return locked;
}