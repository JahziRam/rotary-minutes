"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { sendEmail, welcomeClubEmail } from "@/lib/email";
import { linkClubReferral } from "@/actions/billing";
import {
  findDuplicateClub,
  findExistingMemberInClub,
  findExistingMembership,
  generateUniqueClubSlug,
} from "@/lib/registration";
import type { ClubType } from "@/generated/prisma/client";

export async function registerClub(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clubName: string;
  clubType: ClubType;
  country: string;
  city: string;
  language: "FR" | "EN";
  referredByCode?: string;
}) {
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

  const locale = data.language === "EN" ? "en" : "fr";
  const { getAppBaseUrl } = await import("@/lib/app-url");
  const baseUrl = getAppBaseUrl();
  const welcome = welcomeClubEmail({
    clubName: data.clubName,
    clubId: createdClubId,
    locale,
    dashboardUrl: `${baseUrl}/${locale}/dashboard`,
  });
  await sendEmail({
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
  language: "FR" | "EN";
}) {
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
        role: { in: ["ADMIN", "PRESIDENT", "MEMBERSHIP_CHAIR", "SECRETARY"] },
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

export async function logoutUser(formData: FormData) {
  const locale = (formData.get("locale") as string) || "fr";
  await signOut({ redirectTo: `/${locale}/login` });
}

export async function loginUser(email: string, password: string) {
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