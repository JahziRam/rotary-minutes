"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import type { ClubRole } from "@/generated/prisma/client";

function revalidateClubUsers() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/users`);
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/dashboard`);
  }
}

export async function inviteClubUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: ClubRole;
}) {
  const auth = await requirePermission("users.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const email = data.email.trim().toLowerCase();
  if (!email) return { error: "INVALID_EMAIL" };

  if (ctx.features.memberLimit) {
    const count = await prisma.clubMembership.count({
      where: { clubId: ctx.clubId, isActive: true },
    });
    if (count >= ctx.features.memberLimit) return { error: "MEMBER_LIMIT" };
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const existing = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId: ctx.clubId, userId: user.id } },
    });
    if (existing?.isActive) return { error: "ALREADY_MEMBER" };
    if (existing) {
      await prisma.clubMembership.update({
        where: { id: existing.id },
        data: { role: data.role, isActive: true },
      });
    } else {
      await prisma.clubMembership.create({
        data: { clubId: ctx.clubId, userId: user.id, role: data.role },
      });
    }
  } else {
    if (!data.password || data.password.length < 8) return { error: "PASSWORD_REQUIRED" };
    const passwordHash = await bcrypt.hash(data.password, 12);
    user = await prisma.user.create({
      data: {
        email,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        passwordHash,
        memberships: {
          create: { clubId: ctx.clubId, role: data.role },
        },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_USER_INVITED",
      entity: "ClubMembership",
      entityId: user.id,
      metadata: { email, role: data.role },
    },
  });

  revalidateClubUsers();
  return { success: true };
}

export async function updateClubUserRole(membershipId: string, role: ClubRole) {
  const auth = await requirePermission("users.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const membership = await prisma.clubMembership.findFirst({
    where: { id: membershipId, clubId: ctx.clubId },
  });
  if (!membership) return { error: "NOT_FOUND" };

  await prisma.clubMembership.update({
    where: { id: membershipId },
    data: { role },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_USER_ROLE_UPDATED",
      entity: "ClubMembership",
      entityId: membershipId,
      metadata: { role },
    },
  });

  revalidateClubUsers();
  return { success: true };
}

export async function removeClubUser(membershipId: string) {
  const auth = await requirePermission("users.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const membership = await prisma.clubMembership.findFirst({
    where: { id: membershipId, clubId: ctx.clubId },
  });
  if (!membership) return { error: "NOT_FOUND" };
  if (membership.userId === ctx.userId) return { error: "SELF_REMOVE" };

  await prisma.clubMembership.update({
    where: { id: membershipId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_USER_REMOVED",
      entity: "ClubMembership",
      entityId: membershipId,
    },
  });

  revalidateClubUsers();
  return { success: true };
}