"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { getClubContext } from "@/lib/club-context";
import type { CommissionMemberRole } from "@/generated/prisma/client";

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

/** Keep Member.commissionId in sync as primary commission for legacy scope. */
async function syncPrimaryCommissionId(memberId: string) {
  const first = await prisma.commissionMembership.findFirst({
    where: { memberId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { commissionId: true },
  });
  await prisma.member.update({
    where: { id: memberId },
    data: { commissionId: first?.commissionId ?? null },
  });
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
        memberships: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
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
        commissionMemberships: {
          select: { commissionId: true, role: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin),
  ]);

  return {
    canManage,
    members: members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      commissionId: m.commissionId,
      commissionIds: m.commissionMemberships.map((x) => x.commissionId),
    })),
    commissions: commissions.map((c) => {
      const activeMembers = c.memberships
        .filter((x) => x.member.isActive)
        .map((x) => ({
          id: x.member.id,
          firstName: x.member.firstName,
          lastName: x.member.lastName,
          email: x.member.email,
          position: x.member.position,
          role: x.role as CommissionMemberRole,
        }));
      const chairs = activeMembers.filter((m) => m.role === "CHAIR");
      return {
        id: c.id,
        name: c.name,
        chairName: chairs.length
          ? chairs.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
          : c.chairName,
        memberCount: activeMembers.length,
        members: activeMembers,
      };
    }),
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
  memberId: string,
  role: CommissionMemberRole = "MEMBER"
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

  await prisma.commissionMembership.upsert({
    where: {
      commissionId_memberId: { commissionId, memberId },
    },
    create: { commissionId, memberId, role },
    update: { role },
  });

  await syncPrimaryCommissionId(memberId);

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "COMMISSION_MEMBER_ADDED",
      entity: "Commission",
      entityId: commissionId,
      metadata: { memberId, role },
    },
  });

  revalidateCommissions();
  return { success: true as const };
}

export async function setCommissionMemberRole(
  commissionId: string,
  memberId: string,
  role: CommissionMemberRole
) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const membership = await prisma.commissionMembership.findFirst({
    where: {
      commissionId,
      memberId,
      commission: { clubId: ctx.clubId },
    },
  });
  if (!membership) return { error: "NOT_FOUND" as const };

  await prisma.commissionMembership.update({
    where: { id: membership.id },
    data: { role },
  });

  revalidateCommissions();
  return { success: true as const };
}

export async function removeMemberFromCommission(
  memberId: string,
  commissionId?: string
) {
  const auth = await requireMembersManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  if (commissionId) {
    await prisma.commissionMembership.deleteMany({
      where: { memberId, commissionId },
    });
  } else {
    await prisma.commissionMembership.deleteMany({ where: { memberId } });
  }

  await syncPrimaryCommissionId(memberId);

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "COMMISSION_MEMBER_REMOVED",
      entity: "Commission",
      entityId: commissionId,
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

  const memberships = await prisma.commissionMembership.findMany({
    where: { commissionId },
    select: { memberId: true },
  });

  await prisma.commissionMembership.deleteMany({ where: { commissionId } });
  await prisma.commission.update({
    where: { id: commissionId },
    data: { isActive: false },
  });

  for (const m of memberships) {
    await syncPrimaryCommissionId(m.memberId);
  }

  revalidateCommissions();
  return { success: true as const };
}
