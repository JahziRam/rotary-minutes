"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getClubContext } from "@/lib/club-context";

function revalidateMembers() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/statistics`);
  }
}

export async function createMember(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  birthday?: string;
  joinDate?: string;
  sponsorName?: string;
  commissionId?: string;
  bio?: string;
  photoUrl?: string;
}) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.create({
    data: {
      clubId: ctx.clubId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      sponsorName: data.sponsorName || null,
      commissionId: data.commissionId || null,
      bio: data.bio || null,
      photoUrl: data.photoUrl || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      joinDate: data.joinDate ? new Date(data.joinDate) : null,
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

  revalidateMembers();
  return { success: true, member };
}

export async function updateMember(
  memberId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
    birthday?: string;
    joinDate?: string;
    sponsorName?: string;
    commissionId?: string | null;
    bio?: string;
    photoUrl?: string;
    isActive?: boolean;
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