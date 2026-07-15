"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { passwordResetEmail, welcomeClubEmail } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  generateResetToken,
  isPasswordStrong,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-utils";
import { linkClubReferral } from "@/actions/billing";
import {
  findDuplicateClub,
  findExistingMemberInClub,
  findExistingMembership,
  generateUniqueClubSlug,
} from "@/lib/registration";
import type { ClubType } from "@/generated/prisma/client";
import {
  createAuthCaptchaChallenge,
  validateAuthFormGuard,
  type AuthFormGuardPayload,
} from "@/lib/auth-form-guard";

export async function getAuthCaptchaChallenge() {
  return createAuthCaptchaChallenge();
}

function validateAuthCaptcha(
  guard?: AuthFormGuardPayload
): { ok: true } | { error: "CAPTCHA_FAILED" } {
  if (!guard) return { error: "CAPTCHA_FAILED" };
  const result = validateAuthFormGuard(guard);
  if (!result.ok) return { error: "CAPTCHA_FAILED" };
  return { ok: true };
}

export async function registerClub(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clubName: string;
  clubType: ClubType;
  country: string;
  city: string;
  language: "FR" | "EN" | "ES";
  referredByCode?: string;
  captcha?: AuthFormGuardPayload;
}) {
  const captchaCheck = validateAuthCaptcha(data.captcha);
  if ("error" in captchaCheck) return captchaCheck;

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.trim().toLowerCase() },
  });
  if (existingUser) {
    return { error: "EMAIL_EXISTS" as const };
  }

  const duplicateClub = await findDuplicateClub({
    clubName: data.clubName,
    city: data.city,
    country: data.country,
  });
  if (duplicateClub) {
    return { error: "CLUB_EXISTS" as const };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const finalSlug = await generateUniqueClubSlug(data.clubName);

  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const trialDays = settings?.trialDays ?? 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  let createdClubId = "";
  await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name: data.clubName.trim(),
        slug: finalSlug,
        type: data.clubType,
        country: data.country.trim(),
        city: data.city.trim(),
        language: data.language,
        email: data.email.trim().toLowerCase(),
        presidentName: `${data.firstName} ${data.lastName}`,
      },
    });
    createdClubId = club.id;

    const user = await tx.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        language: data.language,
      },
    });

    await tx.clubMembership.create({
      data: {
        clubId: club.id,
        userId: user.id,
        role: "ADMIN",
        approvalStatus: "APPROVED",
        isActive: true,
      },
    });

    await tx.subscription.create({
      data: {
        clubId: club.id,
        plan: "TRIAL",
        status: "TRIALING",
        trialEndsAt,
      },
    });

    await tx.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: "CLUB_REGISTERED",
        entity: "Club",
        entityId: club.id,
        metadata: { clubType: data.clubType },
      },
    });
  });

  const { syncClubFeaturesFromPlan } = await import("@/lib/features");
  await syncClubFeaturesFromPlan(createdClubId, "TRIAL");

  const locale =
    data.language === "EN" ? "en" : data.language === "ES" ? "es" : "fr";
  const { getAppBaseUrl } = await import("@/lib/app-url");
  const baseUrl = getAppBaseUrl();
  const welcome = await welcomeClubEmail({
    clubName: data.clubName,
    clubId: createdClubId,
    locale,
    dashboardUrl: `${baseUrl}/${locale}/dashboard`,
  });
  await sendClubEmail(createdClubId, {
    to: data.email,
    subject: welcome.subject,
    html: welcome.html,
    attachments: welcome.attachments,
  });

  if (createdClubId && data.referredByCode?.trim()) {
    await linkClubReferral(createdClubId, data.referredByCode);
  }

  if (createdClubId) {
    await prisma.clubOnboarding.upsert({
      where: { clubId: createdClubId },
      update: {},
      create: { clubId: createdClubId, currentStep: "CLUB_PROFILE", completedSteps: [] },
    });

    const { notifySuperAdminNewClubSignup } = await import("@/lib/admin-notify");
    await notifySuperAdminNewClubSignup({
      clubName: data.clubName,
      clubSlug: finalSlug,
      adminEmail: data.email,
      clubType: data.clubType,
      country: data.country,
      locale,
    });
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    return { success: true as const, kind: "club" as const };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "SIGNIN_FAILED" as const };
    }
    throw error;
  }
}

export async function registerMember(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clubId: string;
  language: "FR" | "EN" | "ES";
  captcha?: AuthFormGuardPayload;
}) {
  const captchaCheck = validateAuthCaptcha(data.captcha);
  if ("error" in captchaCheck) return captchaCheck;

  const normalizedEmail = data.email.trim().toLowerCase();

  const club = await prisma.club.findFirst({
    where: { id: data.clubId, isActive: true },
    select: { id: true, name: true },
  });
  if (!club) {
    return { error: "CLUB_NOT_FOUND" as const };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true },
  });

  if (existingUser) {
    if (!existingUser.passwordHash) {
      return { error: "EMAIL_EXISTS" as const };
    }
    const passwordValid = await bcrypt.compare(data.password, existingUser.passwordHash);
    if (!passwordValid) {
      return { error: "EMAIL_EXISTS" as const };
    }

    const membership = await findExistingMembership(club.id, existingUser.id);
    if (membership) {
      if (membership.approvalStatus === "PENDING") {
        return { error: "MEMBERSHIP_PENDING" as const };
      }
      if (membership.approvalStatus === "APPROVED") {
        return { error: "ALREADY_MEMBER" as const };
      }
      if (membership.approvalStatus === "REJECTED") {
        return { error: "MEMBERSHIP_REJECTED" as const };
      }
    }

    const isDuplicate = await findExistingMemberInClub(club.id, normalizedEmail, existingUser.id);
    if (isDuplicate) {
      return { error: "ALREADY_MEMBER" as const };
    }
  } else {
    const isDuplicate = await findExistingMemberInClub(club.id, normalizedEmail);
    if (isDuplicate) {
      return { error: "MEMBER_EXISTS_IN_CLUB" as const };
    }
  }

  const passwordHash = existingUser ? null : await bcrypt.hash(data.password, 12);

  await prisma.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash: passwordHash!,
          language: data.language,
        },
      }));

    await tx.clubMembership.create({
      data: {
        clubId: club.id,
        userId: user.id,
        role: "READER",
        approvalStatus: "PENDING",
        isActive: false,
      },
    });

    await tx.member.create({
      data: {
        clubId: club.id,
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: normalizedEmail,
        isActive: false,
      },
    });

    const adminMemberships = await tx.clubMembership.findMany({
      where: {
        clubId: club.id,
        isActive: true,
        approvalStatus: "APPROVED",
        role: {
          in: ["ADMIN", "PRESIDENT", "VICE_PRESIDENT", "MEMBERSHIP_CHAIR", "SECRETARY"],
        },
      },
      select: { userId: true },
    });

    if (adminMemberships.length > 0) {
      await tx.notification.createMany({
        data: adminMemberships.map((m) => ({
          userId: m.userId,
          clubId: club.id,
          type: "SYSTEM" as const,
          title: "Demande d'adhésion",
          message: `${data.firstName} ${data.lastName} souhaite rejoindre le club.`,
          link: "/dashboard",
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: "MEMBER_JOIN_REQUESTED",
        entity: "ClubMembership",
        metadata: { email: normalizedEmail },
      },
    });
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password: data.password,
      redirect: false,
    });
    return { success: true as const, kind: "member" as const, clubName: club.name };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "SIGNIN_FAILED" as const };
    }
    throw error;
  }
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string, locale = "fr") {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { error: "INVALID_EMAIL" as const };

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, firstName: true, lastName: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    const token = generateResetToken();
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
    await prisma.verificationToken.create({
      data: { identifier: normalized, token, expires },
    });

    const safeLocale = locale === "fr" || locale === "en" || locale === "es" ? locale : "fr";
    const resetUrl = `${getAppBaseUrl()}/${safeLocale}/reset-password?token=${token}`;
    const mail = await passwordResetEmail({
      userName: `${user.firstName} ${user.lastName}`.trim() || normalized,
      resetUrl,
      locale: safeLocale,
    });
    await sendEmail({ to: normalized, subject: mail.subject, html: mail.html });
  }

  return { success: true as const };
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
  locale = "fr"
) {
  if (!isPasswordStrong(password)) {
    return { error: "PASSWORD_TOO_SHORT" as const, minLength: PASSWORD_MIN_LENGTH };
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return { error: "INVALID_TOKEN" as const };
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true },
  });
  if (!user) return { error: "INVALID_TOKEN" as const };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  void locale;
  return { success: true as const };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" as const };

  if (!isPasswordStrong(newPassword)) {
    return { error: "PASSWORD_TOO_SHORT" as const, minLength: PASSWORD_MIN_LENGTH };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) return { error: "NO_PASSWORD" as const };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "INVALID_CURRENT_PASSWORD" as const };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
    },
  });

  return { success: true as const };
}

export async function completeRequiredPasswordChange(newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" as const };

  if (!isPasswordStrong(newPassword)) {
    return { error: "PASSWORD_TOO_SHORT" as const, minLength: PASSWORD_MIN_LENGTH };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, mustChangePassword: true },
  });
  if (!user?.mustChangePassword) return { error: "NOT_REQUIRED" as const };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
      metadata: { required: true },
    },
  });

  return { success: true as const };
}

export async function logoutUser(formData: FormData) {
  const locale = (formData.get("locale") as string) || "fr";
  await signOut({ redirectTo: `/${locale}/login` });
}

export async function loginUser(
  email: string,
  password: string,
  captcha?: AuthFormGuardPayload
) {
  const captchaCheck = validateAuthCaptcha(captcha);
  if ("error" in captchaCheck) return captchaCheck;

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (typeof result === "string" && result.includes("error=")) {
      return { error: "INVALID_CREDENTIALS" as const };
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        isSuperAdmin: true,
        mustChangePassword: true,
        memberships: {
          where: { isActive: true, approvalStatus: "APPROVED" },
          select: { id: true },
        },
        _count: {
          select: {
            memberships: {
              where: { approvalStatus: "PENDING" },
            },
          },
        },
      },
    });
    if (!user) {
      return { error: "INVALID_CREDENTIALS" as const };
    }

    const hasPending = user._count.memberships > 0;
    const hasApproved = user.memberships.length > 0;

    return {
      success: true as const,
      isSuperAdmin: user.isSuperAdmin,
      hasPending,
      hasApproved,
      mustChangePassword: user.mustChangePassword,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "INVALID_CREDENTIALS" as const };
      }
      return { error: "AUTH_ERROR" as const };
    }
    throw error;
  }
}