"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission } from "@/lib/require-permission";
import { DEFAULT_MEMBER_APP_ROLE } from "@/lib/member-roles";
import { memberLoginEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { getAppBaseUrl } from "@/lib/app-url";
import type { ClubRole } from "@/generated/prisma/client";

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

function revalidateClubUsers() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/settings/users`);
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/members`);
  }
}

async function resolveMemberUserId(
  member: { userId: string | null; email: string | null }
): Promise<string | null> {
  if (member.userId) return member.userId;
  if (!member.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: member.email.trim().toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function getMemberAppRoleInfo(memberId: string) {
  const ctx = await getClubContext();
  if (!ctx) return null;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
    select: { id: true, userId: true, email: true },
  });
  if (!member) return null;

  const userId = await resolveMemberUserId(member);
  if (!userId) {
    return {
      hasAccount: false as const,
      membershipId: null,
      role: null,
      customRoleId: null,
      isActive: false,
      userId: null,
    };
  }

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId } },
  });

  return {
    hasAccount: true as const,
    membershipId: membership?.id ?? null,
    role: membership?.role ?? null,
    customRoleId: membership?.customRoleId ?? null,
    isActive: membership?.isActive ?? false,
    userId,
  };
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

export async function updateMemberRole(
  memberId: string,
  role: ClubRole,
  customRoleId?: string | null
) {
  const auth = await requirePermission("users.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!member) return { error: "NOT_FOUND" };

  const userId = await resolveMemberUserId(member);
  if (!userId) return { error: "NO_USER_ACCOUNT" };
  if (userId === ctx.userId) return { error: "SELF_ROLE_CHANGE" };

  if (customRoleId) {
    if (!ctx.isSuperAdmin) return { error: "FORBIDDEN" };
    const customRole = await prisma.customRole.findFirst({
      where: { id: customRoleId, isActive: true },
    });
    if (!customRole) return { error: "CUSTOM_ROLE_NOT_FOUND" };
  }

  const existing = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId } },
  });

  const membership = existing
    ? await prisma.clubMembership.update({
        where: { id: existing.id },
        data: {
          role,
          ...(ctx.isSuperAdmin ? { customRoleId: customRoleId ?? null } : {}),
          isActive: true,
          approvalStatus: "APPROVED",
        },
      })
    : await prisma.clubMembership.create({
        data: {
          clubId: ctx.clubId,
          userId,
          role,
          customRoleId: ctx.isSuperAdmin ? (customRoleId ?? null) : null,
          approvalStatus: "APPROVED",
        },
      });

  if (!member.userId) {
    await prisma.member.update({
      where: { id: memberId },
      data: { userId },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEMBER_ROLE_UPDATED",
      entity: "ClubMembership",
      entityId: membership.id,
      metadata: { memberId, role, customRoleId: customRoleId ?? null },
    },
  });

  revalidateClubUsers();
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/members/${memberId}`);
  }
  return { success: true };
}

export async function sendMemberLoginCredentials(memberId: string, locale = "fr") {
  const auth = await requirePermission("users.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });
  if (!member) return { error: "NOT_FOUND" };

  const email = member.email?.trim().toLowerCase();
  if (!email) return { error: "NO_EMAIL" };

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { name: true, language: true, logoUrl: true },
  });
  if (!club) return { error: "NOT_FOUND" };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  let user = await prisma.user.findUnique({ where: { email } });
  const isNewAccount = !user;

  if (!user) {
    if (ctx.features.memberLimit) {
      const count = await prisma.clubMembership.count({
        where: { clubId: ctx.clubId, isActive: true },
      });
      if (count >= ctx.features.memberLimit) return { error: "MEMBER_LIMIT" };
    }

    user = await prisma.user.create({
      data: {
        email,
        firstName: member.firstName,
        lastName: member.lastName,
        passwordHash,
        language: club.language,
      },
    });
  } else {
    if (user.id === ctx.userId) return { error: "SELF_LOGIN_SEND" };
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  const existingMembership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId: user.id } },
  });

  if (existingMembership) {
    if (!existingMembership.isActive || existingMembership.approvalStatus !== "APPROVED") {
      if (ctx.features.memberLimit && !existingMembership.isActive) {
        const count = await prisma.clubMembership.count({
          where: { clubId: ctx.clubId, isActive: true },
        });
        if (count >= ctx.features.memberLimit) return { error: "MEMBER_LIMIT" };
      }
      await prisma.clubMembership.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          approvalStatus: "APPROVED",
          role: existingMembership.role || DEFAULT_MEMBER_APP_ROLE,
        },
      });
    }
  } else {
    if (ctx.features.memberLimit) {
      const count = await prisma.clubMembership.count({
        where: { clubId: ctx.clubId, isActive: true },
      });
      if (count >= ctx.features.memberLimit) return { error: "MEMBER_LIMIT" };
    }
    await prisma.clubMembership.create({
      data: {
        clubId: ctx.clubId,
        userId: user.id,
        role: DEFAULT_MEMBER_APP_ROLE,
        approvalStatus: "APPROVED",
        isActive: true,
      },
    });
  }

  if (!member.userId) {
    await prisma.member.update({
      where: { id: memberId },
      data: { userId: user.id },
    });
  }

  const memberLocale =
    locale === "fr" || locale === "en" || locale === "es"
      ? locale
      : club.language === "EN"
        ? "en"
        : club.language === "ES"
          ? "es"
          : "fr";

  const mail = await memberLoginEmail({
    clubName: club.name,
    clubId: ctx.clubId,
    memberName: `${member.firstName} ${member.lastName}`,
    email,
    tempPassword,
    loginUrl: `${getAppBaseUrl()}/${memberLocale}/login`,
    locale: memberLocale,
    logoUrl: club.logoUrl ?? undefined,
    isNewAccount,
  });

  const result = await sendClubEmail(ctx.clubId, {
    to: email,
    subject: mail.subject,
    html: mail.html,
    attachments: mail.attachments,
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEMBER_LOGIN_SENT",
      entity: "Member",
      entityId: memberId,
      metadata: { email, isNewAccount },
    },
  });

  revalidateClubUsers();
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/members/${memberId}`);
  }

  if (!result.ok) {
    return { error: "EMAIL_FAILED" as const, message: result.error };
  }
  return { success: true as const };
}