"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-permission";
import type { Permission } from "@/lib/permissions";

function revalidateRolesPaths(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/admin/roles`);
  }
  revalidatePath(`/${locale}/admin/roles`);
}

export async function createCustomRole(
  data: {
    key: string;
    labelFr: string;
    labelEn: string;
    description?: string | null;
    permissions: Permission[];
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const key = data.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!key || key.length < 2) return { error: "INVALID_KEY" as const };

  const existing = await prisma.customRole.findUnique({ where: { key } });
  if (existing) return { error: "KEY_EXISTS" as const };

  const role = await prisma.customRole.create({
    data: {
      key,
      labelFr: data.labelFr.trim(),
      labelEn: data.labelEn.trim(),
      description: data.description?.trim() || null,
      permissions: data.permissions,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.ctx.userId,
      action: "CUSTOM_ROLE_CREATED",
      entity: "CustomRole",
      entityId: role.id,
      metadata: { key, permissions: data.permissions },
    },
  });

  revalidateRolesPaths(locale);
  return { success: true as const, role };
}

export async function updateCustomRole(
  id: string,
  data: {
    labelFr?: string;
    labelEn?: string;
    description?: string | null;
    permissions?: Permission[];
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const existing = await prisma.customRole.findUnique({ where: { id } });
  if (!existing) return { error: "NOT_FOUND" as const };

  const role = await prisma.customRole.update({
    where: { id },
    data: {
      ...(data.labelFr !== undefined && { labelFr: data.labelFr.trim() }),
      ...(data.labelEn !== undefined && { labelEn: data.labelEn.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.permissions !== undefined && { permissions: data.permissions }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.ctx.userId,
      action: "CUSTOM_ROLE_UPDATED",
      entity: "CustomRole",
      entityId: role.id,
      metadata: data as object,
    },
  });

  revalidateRolesPaths(locale);
  return { success: true as const, role };
}

export async function deleteCustomRole(id: string, locale: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const existing = await prisma.customRole.findUnique({
    where: { id },
    include: { _count: { select: { memberships: true } } },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing._count.memberships > 0) {
    return { error: "HAS_MEMBERSHIPS" as const, count: existing._count.memberships };
  }

  await prisma.customRole.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: auth.ctx.userId,
      action: "CUSTOM_ROLE_DELETED",
      entity: "CustomRole",
      entityId: id,
      metadata: { key: existing.key },
    },
  });

  revalidateRolesPaths(locale);
  return { success: true as const };
}