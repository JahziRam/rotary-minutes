import type { ClubRoleType } from "./rotary";

/** Matrice de permissions par défaut (utilisée pour initialiser RoleConfig en base). */
export const PERMISSIONS = {
  "minutes.create": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN"],
  "minutes.edit": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN"],
  "minutes.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "FOUNDATION_CHAIR",
    "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR", "ADMIN", "READER",
  ],
  "minutes.submit": ["SECRETARY", "PROTOCOL", "ADMIN"],
  "minutes.approve": ["PRESIDENT", "VICE_PRESIDENT", "ADMIN"],
  "minutes.finalize": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN"],
  "minutes.delete": ["PRESIDENT", "VICE_PRESIDENT", "COMMISSION_CHAIR", "ADMIN"],
  "minutes.comment": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "FOUNDATION_CHAIR",
    "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR", "ADMIN", "READER",
  ],
  "meetings.create": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN",
  ],
  "meetings.edit": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN",
  ],
  "members.manage": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "MEMBERSHIP_CHAIR", "ADMIN"],
  "dues.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "TREASURER", "MEMBERSHIP_CHAIR", "ADMIN",
    "READER", "PROTOCOL", "FOUNDATION_CHAIR", "PUBLIC_IMAGE_CHAIR", "COMMISSION_CHAIR",
  ],
  "dues.manage": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "TREASURER", "ADMIN"],
  "treasury.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER",
  ],
  "treasury.manage": ["PRESIDENT", "VICE_PRESIDENT", "TREASURER", "ADMIN"],
  "actions.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "ADMIN", "READER",
    "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR", "FOUNDATION_CHAIR",
  ],
  "actions.manage": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN",
  ],
  "projects.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "TREASURER", "ADMIN", "READER",
    "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR", "FOUNDATION_CHAIR",
  ],
  "projects.manage": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PROTOCOL", "COMMISSION_CHAIR", "ADMIN",
  ],
  "calendar.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER", "PROTOCOL",
    "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR", "FOUNDATION_CHAIR",
  ],
  "events.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN", "READER", "MEMBERSHIP_CHAIR",
    "COMMISSION_CHAIR", "PUBLIC_IMAGE_CHAIR",
  ],
  "events.manage": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PUBLIC_IMAGE_CHAIR", "COMMISSION_CHAIR", "ADMIN",
  ],
  "documents.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "READER", "PROTOCOL",
    "COMMISSION_CHAIR",
  ],
  "documents.manage": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN"],
  "governance.view": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN", "READER"],
  "governance.manage": ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN"],
  "attendance.view": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "MEMBERSHIP_CHAIR", "COMMISSION_CHAIR", "ADMIN", "READER",
  ],
  "emails.send": [
    "PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "PUBLIC_IMAGE_CHAIR", "COMMISSION_CHAIR", "ADMIN",
  ],
  "settings.manage": ["PRESIDENT", "VICE_PRESIDENT", "ADMIN"],
  "users.manage": ["PRESIDENT", "VICE_PRESIDENT", "ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<Permission, { fr: string; en: string; es: string }> = {
  "minutes.create": { fr: "Créer des PV", en: "Create minutes", es: "Crear actas" },
  "minutes.edit": { fr: "Modifier des PV", en: "Edit minutes", es: "Editar actas" },
  "minutes.view": { fr: "Voir les PV", en: "View minutes", es: "Ver actas" },
  "minutes.submit": { fr: "Soumettre des PV en révision", en: "Submit minutes for review", es: "Enviar actas a revisión" },
  "minutes.approve": { fr: "Approuver des PV", en: "Approve minutes", es: "Aprobar actas" },
  "minutes.finalize": { fr: "Finaliser des PV", en: "Finalize minutes", es: "Finalizar actas" },
  "minutes.delete": { fr: "Archiver des PV", en: "Archive minutes", es: "Archivar actas" },
  "minutes.comment": { fr: "Commenter les PV", en: "Comment on minutes", es: "Comentar actas" },
  "meetings.create": { fr: "Créer des réunions", en: "Create meetings", es: "Crear reuniones" },
  "meetings.edit": { fr: "Modifier des réunions", en: "Edit meetings", es: "Editar reuniones" },
  "members.manage": { fr: "Gérer les membres", en: "Manage members", es: "Gestionar miembros" },
  "dues.view": { fr: "Voir les cotisations", en: "View dues", es: "Ver cuotas" },
  "dues.manage": { fr: "Gérer les cotisations", en: "Manage dues", es: "Gestionar cuotas" },
  "treasury.view": { fr: "Voir la trésorerie", en: "View treasury", es: "Ver tesorería" },
  "treasury.manage": { fr: "Gérer la trésorerie", en: "Manage treasury", es: "Gestionar tesorería" },
  "actions.view": { fr: "Voir les actions", en: "View actions", es: "Ver acciones" },
  "actions.manage": { fr: "Gérer les actions", en: "Manage actions", es: "Gestionar acciones" },
  "projects.view": { fr: "Voir les projets", en: "View projects", es: "Ver proyectos" },
  "projects.manage": { fr: "Gérer les projets", en: "Manage projects", es: "Gestionar proyectos" },
  "calendar.view": { fr: "Voir le calendrier", en: "View calendar", es: "Ver calendario" },
  "events.view": { fr: "Voir les événements", en: "View events", es: "Ver eventos" },
  "events.manage": { fr: "Gérer les événements", en: "Manage events", es: "Gestionar eventos" },
  "documents.view": { fr: "Voir les documents", en: "View documents", es: "Ver documentos" },
  "documents.manage": { fr: "Gérer les documents", en: "Manage documents", es: "Gestionar documentos" },
  "governance.view": { fr: "Voir la gouvernance", en: "View governance", es: "Ver gobernanza" },
  "governance.manage": { fr: "Gérer la gouvernance", en: "Manage governance", es: "Gestionar gobernanza" },
  "attendance.view": { fr: "Voir l'assiduité", en: "View attendance", es: "Ver asistencia" },
  "emails.send": { fr: "Envoyer des emails", en: "Send emails", es: "Enviar correos" },
  "settings.manage": { fr: "Gérer les paramètres", en: "Manage settings", es: "Gestionar ajustes" },
  "users.manage": { fr: "Gérer les utilisateurs", en: "Manage users", es: "Gestionar usuarios" },
};

export function getPermissionLabel(permission: Permission, locale: string): string {
  const labels = PERMISSION_LABELS[permission];
  if (locale === "fr") return labels.fr;
  if (locale === "es") return labels.es;
  return labels.en;
}

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