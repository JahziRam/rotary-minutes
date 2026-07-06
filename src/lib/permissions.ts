import type { ClubRoleType } from "./rotary";

/** Matrice de permissions par défaut (utilisée pour initialiser RoleConfig en base). */
export const PERMISSIONS = {
  "minutes.create": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.edit": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.view": [
    "PRESIDENT",
    "SECRETARY",
    "PROTOCOL",
    "TREASURER",
    "FOUNDATION_CHAIR",
    "MEMBERSHIP_CHAIR",
    "PUBLIC_IMAGE_CHAIR",
    "ADMIN",
    "READER",
  ],
  "minutes.submit": ["SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.approve": ["PRESIDENT", "ADMIN"],
  "minutes.finalize": ["PRESIDENT", "SECRETARY", "ADMIN"],
  "minutes.delete": ["PRESIDENT", "ADMIN"],
  "meetings.create": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "meetings.edit": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "members.manage": ["PRESIDENT", "SECRETARY", "MEMBERSHIP_CHAIR", "ADMIN"],
  "dues.view": [
    "PRESIDENT",
    "SECRETARY",
    "TREASURER",
    "MEMBERSHIP_CHAIR",
    "ADMIN",
    "READER",
    "PROTOCOL",
    "FOUNDATION_CHAIR",
    "PUBLIC_IMAGE_CHAIR",
  ],
  "dues.manage": ["PRESIDENT", "SECRETARY", "TREASURER", "ADMIN"],
  "emails.send": ["PRESIDENT", "SECRETARY", "PUBLIC_IMAGE_CHAIR", "ADMIN"],
  "settings.manage": ["PRESIDENT", "ADMIN"],
  "users.manage": ["PRESIDENT", "ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<Permission, { fr: string; en: string }> = {
  "minutes.create": { fr: "Créer des PV", en: "Create minutes" },
  "minutes.edit": { fr: "Modifier des PV", en: "Edit minutes" },
  "minutes.view": { fr: "Voir les PV", en: "View minutes" },
  "minutes.submit": { fr: "Soumettre des PV en révision", en: "Submit minutes for review" },
  "minutes.approve": { fr: "Approuver des PV", en: "Approve minutes" },
  "minutes.finalize": { fr: "Finaliser des PV", en: "Finalize minutes" },
  "minutes.delete": { fr: "Archiver des PV", en: "Archive minutes" },
  "meetings.create": { fr: "Créer des réunions", en: "Create meetings" },
  "meetings.edit": { fr: "Modifier des réunions", en: "Edit meetings" },
  "members.manage": { fr: "Gérer les membres", en: "Manage members" },
  "dues.view": { fr: "Voir les cotisations", en: "View dues" },
  "dues.manage": { fr: "Gérer les cotisations", en: "Manage dues" },
  "emails.send": { fr: "Envoyer des emails", en: "Send emails" },
  "settings.manage": { fr: "Gérer les paramètres", en: "Manage settings" },
  "users.manage": { fr: "Gérer les utilisateurs", en: "Manage users" },
};

/** Vérification synchrone (fallback / SSR léger). */
export function hasPermission(
  role: ClubRoleType,
  permission: Permission,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function getRolePermissions(role: ClubRoleType): Permission[] {
  return ALL_PERMISSIONS.filter((p) => hasPermission(role, p));
}