"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DistrictAccessRole } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;
  return session.user;
}

function revalidateDistrictPaths(locale: string) {
  revalidatePath(`/${locale}/district`);
  revalidatePath(`/${locale}/district/minutes`);
  revalidatePath(`/${locale}/admin/users`);
}

export async function grantDistrictAccess(
  data: {
    userId: string;
    district: string;
    role: DistrictAccessRole;
    canViewPV: boolean;
    expiresAt?: string | null;
  },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) return { error: "USER_NOT_FOUND" as const };

  const district = data.district.trim();
  if (!district) return { error: "INVALID_DISTRICT" as const };

  await prisma.districtAccess.upsert({
    where: {
      userId_district: { userId: data.userId, district },
    },
    create: {
      userId: data.userId,
      district,
      role: data.role,
      canViewPV: data.canViewPV,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      grantedById: admin.id,
    },
    update: {
      role: data.role,
      canViewPV: data.canViewPV,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      grantedById: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "DISTRICT_ACCESS_GRANTED",
      entity: "DistrictAccess",
      entityId: data.userId,
      metadata: {
        district,
        role: data.role,
        canViewPV: data.canViewPV,
        targetEmail: user.email,
      },
    },
  });

  revalidateDistrictPaths(locale);
  return { success: true as const };
}

export async function revokeDistrictAccess(
  accessId: string,
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const access = await prisma.districtAccess.findUnique({
    where: { id: accessId },
    include: { user: { select: { email: true } } },
  });
  if (!access) return { error: "NOT_FOUND" as const };

  await prisma.districtAccess.delete({ where: { id: accessId } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "DISTRICT_ACCESS_REVOKED",
      entity: "DistrictAccess",
      entityId: accessId,
      metadata: {
        district: access.district,
        targetEmail: access.user.email,
      },
    },
  });

  revalidateDistrictPaths(locale);
  return { success: true as const };
}

export async function searchUsersForDistrictGrant(query: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const, users: [] };

  const q = query.trim();
  if (q.length < 2) return { users: [] };

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { email: "asc" },
    take: 10,
  });

  return { users };
}