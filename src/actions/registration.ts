"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { canManageMemberRoles } from "@/lib/member-roles";
import type { ClubRole, ClubType } from "@/generated/prisma/client";

function revalidateRegistrationPaths() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/pending-approval`);
  }
}

export async function listPublicClubs(query?: string) {
  const clubs = await prisma.club.findMany({
    where: {
      isActive: true,
      ...(query?.trim()
        ? {
            OR: [
              { name: { contains: query.trim(), mode: "insensitive" } },
              { city: { contains: query.trim(), mode: "insensitive" } },
              { country: { contains: query.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      type: true,
    },
    orderBy: [{ country: "asc" }, { city: "asc" }, { name: "asc" }],
    take: 100,
  });

  return clubs.map((c) => ({
    id: c.id,
    label: `${c.name} — ${c.city}, ${c.country}`,
    name: c.name,
    city: c.city,
    country: c.country,
    type: c.type as ClubType,
  }));
}

export async function getPendingJoinRequests() {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const requests = await prisma.clubMembership.findMany({
    where: {
      clubId: ctx.clubId,
      approvalStatus: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return {
    requests: requests.map((r) => ({
      membershipId: r.id,
      userId: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
      requestedAt: r.joinedAt.toISOString(),
    })),
  };
}

export async function approveJoinRequest(
  membershipId: string,
  opts?: { role?: ClubRole; customRoleId?: string | null }
) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  let role: ClubRole = "READER";
  let customRoleId: string | null = null;

  const wantsCustomRole =
    (opts?.role && opts.role !== "READER") || Boolean(opts?.customRoleId);

  if (wantsCustomRole) {
    if (!(await canManageMemberRoles(ctx))) return { error: "FORBIDDEN" as const };
    role = opts?.role ?? "READER";
    if (opts?.customRoleId) {
      if (!ctx.isSuperAdmin) return { error: "FORBIDDEN" as const };
      const customRole = await prisma.customRole.findFirst({
        where: { id: opts.customRoleId, isActive: true },
      });
      if (!customRole) return { error: "CUSTOM_ROLE_NOT_FOUND" as const };
      customRoleId = opts.customRoleId;
    }
  }

  const membership = await prisma.clubMembership.findFirst({
    where: {
      id: membershipId,
      clubId: ctx.clubId,
      approvalStatus: "PENDING",
    },
    include: { user: true },
  });

  if (!membership) return { error: "NOT_FOUND" as const };

  await prisma.$transaction(async (tx) => {
    await tx.clubMembership.update({
      where: { id: membershipId },
      data: {
        approvalStatus: "APPROVED",
        isActive: true,
        role,
        customRoleId: ctx.isSuperAdmin ? customRoleId : null,
      },
    });

    const existingMember = await tx.member.findFirst({
      where: {
        clubId: ctx.clubId,
        OR: [
          { userId: membership.userId },
          {
            email: {
              equals: membership.user.email,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (existingMember) {
      await tx.member.update({
        where: { id: existingMember.id },
        data: {
          userId: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          isActive: true,
        },
      });
    } else {
      await tx.member.create({
        data: {
          clubId: ctx.clubId,
          userId: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          joinDate: new Date(),
        },
      });
      await tx.club.update({
        where: { id: ctx.clubId },
        data: { memberCount: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        action: "MEMBERSHIP_APPROVED",
        entity: "ClubMembership",
        entityId: membershipId,
        metadata: {
          approvedUserId: membership.userId,
          email: membership.user.email,
          role,
          customRoleId,
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: membership.userId,
        clubId: ctx.clubId,
        type: "SYSTEM",
        title: "Inscription approuvée",
        message: `Votre demande d'adhésion au club ${ctx.clubName} a été approuvée.`,
        link: "/dashboard",
      },
    });
  });

  const admins = await prisma.clubMembership.findMany({
    where: {
      clubId: ctx.clubId,
      isActive: true,
      approvalStatus: "APPROVED",
      role: { in: ["ADMIN", "PRESIDENT", "MEMBERSHIP_CHAIR"] },
      userId: { not: ctx.userId },
    },
    select: { userId: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.userId,
        clubId: ctx.clubId,
        type: "SYSTEM" as const,
        title: "Nouveau membre",
        message: `${membership.user.firstName} ${membership.user.lastName} a rejoint le club.`,
        link: "/members",
      })),
    });
  }

  revalidateRegistrationPaths();
  return { success: true as const };
}

export async function rejectJoinRequest(membershipId: string) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const membership = await prisma.clubMembership.findFirst({
    where: {
      id: membershipId,
      clubId: ctx.clubId,
      approvalStatus: "PENDING",
    },
    include: { user: true },
  });

  if (!membership) return { error: "NOT_FOUND" as const };

  await prisma.$transaction(async (tx) => {
    await tx.clubMembership.update({
      where: { id: membershipId },
      data: {
        approvalStatus: "REJECTED",
        isActive: false,
      },
    });

    await tx.member.updateMany({
      where: {
        clubId: ctx.clubId,
        userId: membership.userId,
        isActive: false,
      },
      data: { isActive: false },
    });

    await tx.auditLog.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        action: "MEMBERSHIP_REJECTED",
        entity: "ClubMembership",
        entityId: membershipId,
        metadata: {
          rejectedUserId: membership.userId,
          email: membership.user.email,
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: membership.userId,
        clubId: ctx.clubId,
        type: "SYSTEM",
        title: "Inscription refusée",
        message: `Votre demande d'adhésion au club ${ctx.clubName} a été refusée.`,
      },
    });
  });

  revalidateRegistrationPaths();
  return { success: true as const };
}