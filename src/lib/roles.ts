import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CLUB_ROLES, type ClubRoleType } from "@/lib/rotary";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

const ROLE_LABELS: Record<ClubRoleType, { fr: string; en: string; desc: string }> = {
  PRESIDENT: { fr: "Président", en: "President", desc: "Accès complet au club" },
  SECRETARY: { fr: "Secrétaire", en: "Secretary", desc: "Gestion des PV et réunions" },
  PROTOCOL: { fr: "Protocol", en: "Protocol", desc: "Rédaction des PV" },
  TREASURER: { fr: "Trésorier", en: "Treasurer", desc: "Gestion des cotisations" },
  FOUNDATION_CHAIR: { fr: "Président Fondation", en: "Foundation Chair", desc: "Consultation" },
  MEMBERSHIP_CHAIR: { fr: "Président Adhésion", en: "Membership Chair", desc: "Gestion des membres" },
  PUBLIC_IMAGE_CHAIR: { fr: "Président Image", en: "Public Image Chair", desc: "Emails et communication" },
  ADMIN: { fr: "Administrateur club", en: "Club Admin", desc: "Administration du club" },
  READER: { fr: "Lecteur", en: "Reader", desc: "Consultation seule" },
};

export function getDefaultPermissions(role: ClubRoleType): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
    (PERMISSIONS[p] as readonly string[]).includes(role)
  );
}

const getRoleConfigsMap = cache(async () => {
  const configs = await prisma.roleConfig.findMany();
  return new Map(
    configs.map((c) => [
      c.role as ClubRoleType,
      { permissions: c.permissions as string[], isActive: c.isActive },
    ])
  );
});

export async function ensureRoleConfigs() {
  for (const role of CLUB_ROLES) {
    const labels = ROLE_LABELS[role];
    const defaults = getDefaultPermissions(role);
    const existing = await prisma.roleConfig.findUnique({ where: { role } });
    const permissions = existing
      ? [...new Set([...(existing.permissions as string[]), ...defaults])]
      : defaults;
    await prisma.roleConfig.upsert({
      where: { role },
      update: { permissions },
      create: {
        role,
        labelFr: labels.fr,
        labelEn: labels.en,
        description: labels.desc,
        permissions: defaults,
      },
    });
  }
}

export async function getRolePermission(role: ClubRoleType, permission: Permission): Promise<boolean> {
  const map = await getRoleConfigsMap();
  const config = map.get(role);
  if (!config || !config.isActive) return false;
  return config.permissions.includes(permission);
}

export async function hasRolePermission(
  role: ClubRoleType,
  permission: Permission,
  isSuperAdmin = false
): Promise<boolean> {
  if (isSuperAdmin) return true;
  return getRolePermission(role, permission);
}

export async function getAllRoleConfigs() {
  await ensureRoleConfigs();
  return prisma.roleConfig.findMany({ orderBy: { role: "asc" } });
}

export { ROLE_LABELS };