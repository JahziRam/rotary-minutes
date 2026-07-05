"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { sendEmail, welcomeClubEmail } from "@/lib/email";
import { linkClubReferral } from "@/actions/billing";

export async function registerClub(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clubName: string;
  country: string;
  city: string;
  language: "FR" | "EN";
  referredByCode?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return { error: "EMAIL_EXISTS" };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const slug = slugify(data.clubName);

  const existingClub = await prisma.club.findUnique({ where: { slug } });
  const finalSlug = existingClub ? `${slug}-${Date.now()}` : slug;

  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const trialDays = settings?.trialDays ?? 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  let createdClubId = "";
  await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name: data.clubName,
        slug: finalSlug,
        country: data.country,
        city: data.city,
        language: data.language,
        email: data.email,
        presidentName: `${data.firstName} ${data.lastName}`,
      },
    });
    createdClubId = club.id;

    const user = await tx.user.create({
      data: {
        email: data.email,
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
      },
    });
  });

  const locale = data.language === "EN" ? "en" : "fr";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const welcome = welcomeClubEmail({
    clubName: data.clubName,
    locale,
    dashboardUrl: `${baseUrl}/${locale}/dashboard`,
  });
  await sendEmail({ to: data.email, subject: welcome.subject, html: welcome.html });

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
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "SIGNIN_FAILED" };
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
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "INVALID_CREDENTIALS" };
    }
    throw error;
  }
}