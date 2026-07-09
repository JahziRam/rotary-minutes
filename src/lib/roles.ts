import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CLUB_ROLES, type ClubRoleType } from "@/lib/rotary";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/role-definitions";

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

const getCustomRolesMap = cache(async () => {
  const roles = await prisma.customRole.findMany();
  return new Map(
    roles.map((r) => [
      r.id,
      { permissions: r.permissions as string[], isActive: r.isActive },
    ])
  );
});

export async function getCustomRolePermissions(customRoleId: string): Promise<string[] | null> {
  const map = await getCustomRolesMap();
  const config = map.get(customRoleId);
  if (!config || !config.isActive) return null;
  return config.permissions;
}

export async function hasRolePermission(
  role: ClubRoleType,
  permission: Permission,
  isSuperAdmin = false,
  customRoleId?: string | null
): Promise<boolean> {
  if (isSuperAdmin) return true;

  if (customRoleId) {
    const customPerms = await getCustomRolePermissions(customRoleId);
    if (customPerms) return customPerms.includes(permission);
  }

  return getRolePermission(role, permission);
}

export async function getAllRoleConfigs() {
  await ensureRoleConfigs();
  return prisma.roleConfig.findMany({ orderBy: { role: "asc" } });
}

export async function getAllCustomRoles() {
  return prisma.customRole.findMany({
    orderBy: { key: "asc" },
    include: { _count: { select: { memberships: true } } },
  });
}

export { ROLE_LABELS } from "@/lib/role-definitions";