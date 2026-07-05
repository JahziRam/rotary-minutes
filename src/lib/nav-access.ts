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
};

/** Routes directes → feature requise (garde-fou pages) */
export const ROUTE_FEATURES: Record<string, keyof ClubFeatureSet> = {
  "/emails": "emailsEnabled",
  "/statistics": "statisticsEnabled",
  "/meetings": "liveMeetings",
  "/district": "districtDashboard",
};

export function shouldShowDistrictNav(
  hasDistrictAccess: boolean,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin || hasDistrictAccess) return true;
  return (
    features.districtDashboard ||
    features.districtMenuVisible
  );
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

/** Modules visibles dans le menu mais désactivés (incitation upgrade). */
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