"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getClubContext } from "@/lib/club-context";
import {
  canManageMemberRoles,
  DEFAULT_MEMBER_APP_ROLE,
} from "@/lib/member-roles";
import type { ClubRole } from "@/generated/prisma/client";
import { findMemberDuplicateInClub } from "@/lib/member-dedup";

function revalidateMembers() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/statistics`);
    revalidatePath(`/${loc}/attendance-reports`);
    revalidatePath(`/${loc}/meetings`);
  }
}

export async function createMember(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  registrationNumber?: string;
  position?: string;
  birthday?: string;
  joinDate?: string;
  sponsorName?: string;
  commissionId?: string;
  bio?: string;
  photoUrl?: string;
  isHonoraryMember?: boolean;
  appRole?: ClubRole;
  customRoleId?: string | null;
  sendLogin?: boolean;
  locale?: string;
}) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const duplicate = await findMemberDuplicateInClub(ctx.clubId, {
    email: data.email,
    registrationNumber: data.registrationNumber,
    firstName: data.firstName,
    lastName: data.lastName,
  });
  if (duplicate) {
    return { error: "DUPLICATE_MEMBER" as const };
  }

  const member = await prisma.member.create({
    data: {
      clubId: ctx.clubId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      registrationNumber: data.registrationNumber?.trim() || null,
      position: data.position || null,
      sponsorName: data.sponsorName || null,
      commissionId: data.commissionId || null,
      bio: data.bio || null,
      photoUrl: data.photoUrl || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      joinDate: data.joinDate ? new Date(data.joinDate) : null,
      isHonoraryMember: data.isHonoraryMember ?? false,
    },
  });

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: { memberCount: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEMBER_CREATED",
      entity: "Member",
      entityId: member.id,
    },
  });

  const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
  void dispatchClubWebhook(ctx.clubId, "MEMBER_CREATED", {
    memberId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
  });

  let roleAssigned = false;
  if (data.email && (await canManageMemberRoles(ctx))) {
    const { updateMemberRole } = await import("@/actions/club-users");
    const roleResult = await updateMemberRole(
      member.id,
      data.appRole ?? DEFAULT_MEMBER_APP_ROLE,
      data.customRoleId
    );
    roleAssigned = "success" in roleResult && Boolean(roleResult.success);
  }

  let loginSent = false;
  if (data.sendLogin && data.email) {
    const { hasRolePermission } = await import("@/lib/roles");
    const canSend =
      ctx.isSuperAdmin ||
      (await hasRolePermission(ctx.role, "users.manage", false, ctx.customRoleId));
    if (canSend) {
      const { sendMemberLoginCredentials } = await import("@/actions/club-users");
      const loginResult = await sendMemberLoginCredentials(
        member.id,
        data.locale ?? "fr"
      );
      loginSent = "success" in loginResult && Boolean(loginResult.success);
    }
  }

  revalidateMembers();
  return { success: true, member, roleAssigned, loginSent };
}

export async function updateMember(
  memberId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    registrationNumber?: string;
    position?: string;
    birthday?: string;
    joinDate?: string;
    sponsorName?: string;
    commissionId?: string | null;
    bio?: string;
    photoUrl?: string;
    isActive?: boolean;
    isHonoraryMember?: boolean;
  }
) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const existing = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" };

  await prisma.member.update({
    where: { id: memberId },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.registrationNumber !== undefined && {
        registrationNumber: data.registrationNumber?.trim() || null,
      }),
      ...(data.position !== undefined && { position: data.position || null }),
      ...(data.sponsorName !== undefined && { sponsorName: data.sponsorName || null }),
      ...(data.commissionId !== undefined && { commissionId: data.commissionId }),
      ...(data.bio !== undefined && { bio: data.bio || null }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
      ...(data.birthday !== undefined && {
        birthday: data.birthday ? new Date(data.birthday) : null,
      }),
      ...(data.joinDate !== undefined && {
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isHonoraryMember !== undefined && {
        isHonoraryMember: data.isHonoraryMember,
      }),
    },
  });

  if (data.isActive === false && existing.isActive) {
    await prisma.club.update({
      where: { id: ctx.clubId },
      data: { memberCount: { decrement: 1 } },
    });
  } else if (data.isActive === true && !existing.isActive) {
    await prisma.club.update({
      where: { id: ctx.clubId },
      data: { memberCount: { increment: 1 } },
    });
  }

  revalidateMembers();
  revalidatePath(`/${ctx.club.language === "EN" ? "en" : "fr"}/members/${memberId}`);
  return { success: true };
}

export async function getMemberDetail(memberId: string) {
  const ctx = await getClubContext();
  if (!ctx) return null;

  return prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
    include: {
      commission: true,
      officerMandates: { orderBy: { startDate: "desc" }, take: 5 },
    },
  });
}

export async function getClubMembers(includeInactive = false) {
  const ctx = await getClubContext();
  if (!ctx) return [];

  return prisma.member.findMany({
    where: {
      clubId: ctx.clubId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: { commission: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}