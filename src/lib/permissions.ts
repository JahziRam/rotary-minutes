import type { ClubRoleType } from "./rotary";

/** Matrice de permissions par défaut (utilisée pour initialiser RoleConfig en base). */
export const PERMISSIONS = {
  "minutes.create": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.edit": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.view": [
    "PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "FOUNDATION_CHAIR",
    "MEMBERSHIP_CHAIR", "PUBLIC_IMAGE_CHAIR", "ADMIN", "READER",
  ],
  "minutes.submit": ["SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.approve": ["PRESIDENT", "ADMIN"],
  "minutes.finalize": ["PRESIDENT", "SECRETARY", "ADMIN"],
  "minutes.delete": ["PRESIDENT", "ADMIN"],
  "meetings.create": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "meetings.edit": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "members.manage": ["PRESIDENT", "SECRETARY", "MEMBERSHIP_CHAIR", "ADMIN"],
  "dues.view": [
    "PRESIDENT", "SECRETARY", "TREASURER", "MEMBERSHIP_CHAIR", "ADMIN",
    "READER", "PROTOCOL", "FOUNDATION_CHAIR", "PUBLIC_IMAGE_CHAIR",
  ],
  "dues.manage": ["PRESIDENT", "SECRETARY", "TREASURER", "ADMIN"],
  "treasury.view": ["PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER"],
  "treasury.manage": ["PRESIDENT", "TREASURER", "ADMIN"],
  "actions.view": [
    "PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "ADMIN", "READER",
    "MEMBERSHIP_CHAIR", "PUBLIC_IMAGE_CHAIR", "FOUNDATION_CHAIR",
  ],
  "actions.manage": ["PRESIDENT", "SECRETARY", "PROTOCOL", "ADMIN"],
  "calendar.view": [
    "PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER", "PROTOCOL",
    "MEMBERSHIP_CHAIR", "PUBLIC_IMAGE_CHAIR", "FOUNDATION_CHAIR",
  ],
  "events.view": [
    "PRESIDENT", "SECRETARY", "ADMIN", "READER", "MEMBERSHIP_CHAIR", "PUBLIC_IMAGE_CHAIR",
  ],
  "events.manage": ["PRESIDENT", "SECRETARY", "PUBLIC_IMAGE_CHAIR", "ADMIN"],
  "documents.view": [
    "PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER", "PROTOCOL",
  ],
  "documents.manage": ["PRESIDENT", "SECRETARY", "ADMIN"],
  "governance.view": ["PRESIDENT", "SECRETARY", "ADMIN", "READER"],
  "governance.manage": ["PRESIDENT", "SECRETARY", "ADMIN"],
  "attendance.view": ["PRESIDENT", "SECRETARY", "MEMBERSHIP_CHAIR", "ADMIN", "READER"],
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
  "treasury.view": { fr: "Voir la trésorerie", en: "View treasury" },
  "treasury.manage": { fr: "Gérer la trésorerie", en: "Manage treasury" },
  "actions.view": { fr: "Voir les actions", en: "View actions" },
  "actions.manage": { fr: "Gérer les actions", en: "Manage actions" },
  "calendar.view": { fr: "Voir le calendrier", en: "View calendar" },
  "events.view": { fr: "Voir les événements", en: "View events" },
  "events.manage": { fr: "Gérer les événements", en: "Manage events" },
  "documents.view": { fr: "Voir les documents", en: "View documents" },
  "documents.manage": { fr: "Gérer les documents", en: "Manage documents" },
  "governance.view": { fr: "Voir la gouvernance", en: "View governance" },
  "governance.manage": { fr: "Gérer la gouvernance", en: "Manage governance" },
  "attendance.view": { fr: "Voir l'assiduité", en: "View attendance" },
  "emails.send": { fr: "Envoyer des emails", en: "Send emails" },
  "settings.manage": { fr: "Gérer les paramètres", en: "Manage settings" },
  "users.manage": { fr: "Gérer les utilisateurs", en: "Manage users" },
};

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