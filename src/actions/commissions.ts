"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { getClubContext } from "@/lib/club-context";

function revalidateCommissions() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/members/commissions`);
    revalidatePath(`/${loc}/actions`);
    revalidatePath(`/${loc}/projects`);
  }
}

async function requireMembersView() {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };
  if (ctx.isSuperAdmin) return { ctx };
  const allowed =
    (await hasRolePermission(ctx.role, "members.manage", false)) ||
    (await hasRolePermission(ctx.role, "actions.view", false)) ||
    (await hasRolePermission(ctx.role, "projects.view", false));
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireMembersManage() {
  return requirePermission("members.manage");
}

export async function listCommissions() {
  const auth = await requireMembersView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const [commissions, members, canManage] = await Promise.all([
    prisma.commission.findMany({
      where: { clubId: ctx.clubId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        members: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        },
        _count: { select: { members: true } },
      },
    }),
    prisma.member.findMany({
      where: { clubId: ctx.clubId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        commissionId: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin),
  ]);

  return {
    canManage,
    members,
    commissions: commissions.map((c) => ({
      id: c.id,
      name: c.name,
      chairName: c.chairName,
      memberCount: c.members.length,
      members: c.members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        position: m.position,
      })),
    })),
  };
}

export async function listCommissionsForSelect() {
  const auth = await requireMembersView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const commissions = await prisma.commission.findMany({
    where: { clubId: ctx.clubId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return { commissions };
}

export async function createCommission(data: {
  name: string;
  chairName?: string;
}) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const name = data.name.trim();
  if (!name) return { error: "INVALID" as const };

  const commission = await prisma.commission.create({
    data: {
      clubId: ctx.clubId,
      name,
      chairName: data.chairName?.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "COMMISSION_CREATED",
      entity: "Commission",
      entityId: commission.id,
    },
  });

  revalidateCommissions();
  return { success: true as const, commissionId: commission.id };
}

export async function updateCommission(
  commissionId: string,
  data: { name?: string; chairName?: string | null; isActive?: boolean }
) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.commission.findFirst({
    where: { id: commissionId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.commission.update({
    where: { id: commissionId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.chairName !== undefined && {
        chairName: data.chairName?.trim() || null,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidateCommissions();
  return { success: true as const };
}

export async function addMemberToCommission(
  commissionId: string,
  memberId: string
) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const [commission, member] = await Promise.all([
    prisma.commission.findFirst({
      where: { id: commissionId, clubId: ctx.clubId, isActive: true },
      select: { id: true },
    }),
    prisma.member.findFirst({
      where: { id: memberId, clubId: ctx.clubId, isActive: true },
      select: { id: true },
    }),
  ]);
  if (!commission || !member) return { error: "NOT_FOUND" as const };

  await prisma.member.update({
    where: { id: memberId },
    data: { commissionId },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "COMMISSION_MEMBER_ADDED",
      entity: "Commission",
      entityId: commissionId,
      metadata: { memberId },
    },
  });

  revalidateCommissions();
  return { success: true as const };
}

export async function removeMemberFromCommission(memberId: string) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
    select: { id: true, commissionId: true },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  await prisma.member.update({
    where: { id: memberId },
    data: { commissionId: null },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "COMMISSION_MEMBER_REMOVED",
      entity: "Commission",
      entityId: member.commissionId ?? undefined,
      metadata: { memberId },
    },
  });

  revalidateCommissions();
  return { success: true as const };
}

export async function deleteCommission(commissionId: string) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.commission.findFirst({
    where: { id: commissionId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.member.updateMany({
    where: { clubId: ctx.clubId, commissionId },
    data: { commissionId: null },
  });
  await prisma.commission.update({
    where: { id: commissionId },
    data: { isActive: false },
  });

  revalidateCommissions();
  return { success: true as const };
}
