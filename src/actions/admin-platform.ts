"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRoleConfigs } from "@/lib/roles";
import { ensureClubFeatures, DEFAULT_FEATURES, type ClubFeatureSet } from "@/lib/features";
import type { ClubRole, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import type { Permission } from "@/lib/permissions";

async function admin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;
  return session.user;
}

function revalidateAdmin(locale: string) {
  const sections = ["", "/users", "/roles", "/announcements", "/settings", "/export", "/clubs", "/subscriptions"];
  for (const loc of ["fr", "en"]) {
    for (const s of sections) {
      revalidatePath(`/${loc}/admin${s}`);
    }
  }
  revalidatePath(`/${locale}/admin`);
}

// ─── Utilisateurs ────────────────────────────────────────────────────────────

export async function createPlatformUser(
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isSuperAdmin?: boolean;
    clubId?: string;
    clubRole?: ClubRole;
  },
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "EMAIL_EXISTS" };

  const passwordHash = await bcrypt.hash(data.password, 12);
  const newUser = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      isSuperAdmin: data.isSuperAdmin ?? false,
    },
  });

  if (data.clubId && !data.isSuperAdmin) {
    await prisma.clubMembership.create({
      data: {
        clubId: data.clubId,
        userId: newUser.id,
        role: data.clubRole ?? "READER",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_CREATED",
      entity: "User",
      entityId: newUser.id,
      metadata: { email: data.email, isSuperAdmin: data.isSuperAdmin },
    },
  });

  revalidateAdmin(locale);
  return { success: true, userId: newUser.id };
}

export async function updatePlatformUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    isSuperAdmin?: boolean;
    clubId?: string;
    clubRole?: ClubRole;
  },
  locale: string
) {
  const actor = await admin();
  if (!actor) return { error: "UNAUTHORIZED" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.isSuperAdmin !== undefined && { isSuperAdmin: data.isSuperAdmin }),
    },
  });

  if (data.clubId && data.clubRole) {
    await prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId: data.clubId, userId } },
      update: { role: data.clubRole },
      create: { clubId: data.clubId, userId, role: data.clubRole },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "USER_UPDATED",
      entity: "User",
      entityId: userId,
      metadata: data as object,
    },
  });

  revalidateAdmin(locale);
  return { success: true };
}

export async function deletePlatformUser(userId: string, locale: string) {
  const actor = await admin();
  if (!actor) return { error: "UNAUTHORIZED" };
  if (actor.id === userId) return { error: "SELF_DELETE" };

  await prisma.user.delete({ where: { id: userId } });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "USER_DELETED",
      entity: "User",
      entityId: userId,
    },
  });

  revalidateAdmin(locale);
  return { success: true };
}

// ─── Rôles ───────────────────────────────────────────────────────────────────

export async function updateRolePermissions(
  role: ClubRole,
  permissions: Permission[],
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  await ensureRoleConfigs();
  await prisma.roleConfig.update({
    where: { role },
    data: { permissions },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ROLE_UPDATED",
      entity: "RoleConfig",
      entityId: role,
      metadata: { permissions },
    },
  });

  revalidateAdmin(locale);
  return { success: true };
}

export async function toggleRoleActive(role: ClubRole, locale: string) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  const config = await prisma.roleConfig.findUnique({ where: { role } });
  if (!config) return { error: "NOT_FOUND" };

  await prisma.roleConfig.update({
    where: { role },
    data: { isActive: !config.isActive },
  });

  revalidateAdmin(locale);
  return { success: true, isActive: !config.isActive };
}

// ─── Paramètres application ──────────────────────────────────────────────────

export async function updateBillingSettings(
  data: {
    annualDiscountPercent: number;
    currency: string;
  },
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  const discount = Math.min(90, Math.max(0, Math.round(data.annualDiscountPercent)));
  const currency = data.currency.trim().toUpperCase().slice(0, 3) || "EUR";

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { annualDiscountPercent: discount, currency },
    create: {
      id: "global",
      appName: "Rotary Minutes",
      annualDiscountPercent: discount,
      currency,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "BILLING_SETTINGS_UPDATED",
      entity: "AppSettings",
      entityId: "global",
      metadata: data as object,
    },
  });

  revalidateAdmin(locale);
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/subscription`);
  }
  return { success: true };
}

export async function updatePlanConfig(
  plan: SubscriptionPlan,
  data: {
    nameFr: string;
    nameEn: string;
    descriptionFr?: string;
    descriptionEn?: string;
    priceMonthly: number;
    featuresFr: string[];
    featuresEn: string[];
    stripePriceIdMonthly?: string;
    stripePriceIdAnnual?: string;
    memberLimit?: number | null;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
  },
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  await prisma.planConfig.upsert({
    where: { plan },
    update: {
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      descriptionFr: data.descriptionFr || null,
      descriptionEn: data.descriptionEn || null,
      priceMonthly: data.priceMonthly,
      featuresFr: data.featuresFr,
      featuresEn: data.featuresEn,
      stripePriceIdMonthly: data.stripePriceIdMonthly || null,
      stripePriceIdAnnual: data.stripePriceIdAnnual || null,
      memberLimit: data.memberLimit ?? null,
      isActive: data.isActive,
      isPopular: data.isPopular,
      sortOrder: data.sortOrder,
    },
    create: {
      plan,
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      descriptionFr: data.descriptionFr || null,
      descriptionEn: data.descriptionEn || null,
      priceMonthly: data.priceMonthly,
      featuresFr: data.featuresFr,
      featuresEn: data.featuresEn,
      stripePriceIdMonthly: data.stripePriceIdMonthly || null,
      stripePriceIdAnnual: data.stripePriceIdAnnual || null,
      memberLimit: data.memberLimit ?? null,
      isActive: data.isActive,
      isPopular: data.isPopular,
      sortOrder: data.sortOrder,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "PLAN_CONFIG_UPDATED",
      entity: "PlanConfig",
      entityId: plan,
      metadata: { plan, priceMonthly: data.priceMonthly },
    },
  });

  revalidateAdmin(locale);
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/subscription`);
  }
  return { success: true };
}

export async function updateAppSettings(
  data: {
    appName: string;
    tagline?: string;
    supportEmail?: string;
    trialDays: number;
    maintenanceMode: boolean;
  },
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "APP_SETTINGS_UPDATED",
      entity: "AppSettings",
      entityId: "global",
    },
  });

  revalidateAdmin(locale);
  return { success: true };
}

// ─── Intégrations Stripe & Resend ────────────────────────────────────────────

export async function updateIntegrationSettings(
  data: {
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    stripeWebhookSecret?: string;
    resendApiKey?: string;
    emailFrom?: string;
    stripeEnabled?: boolean;
    resendEnabled?: boolean;
  },
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const { mergeAndSaveIntegrations } = await import("@/lib/platform-integrations");
  await mergeAndSaveIntegrations(data);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "INTEGRATIONS_UPDATED",
      entity: "AppSettings",
      entityId: "global",
      metadata: {
        stripeEnabled: data.stripeEnabled,
        resendEnabled: data.resendEnabled,
        keysUpdated: {
          stripeSecret: !!data.stripeSecretKey?.trim(),
          stripePublishable: !!data.stripePublishableKey?.trim(),
          stripeWebhook: !!data.stripeWebhookSecret?.trim(),
          resendApi: !!data.resendApiKey?.trim(),
        },
      },
    },
  });

  revalidateAdmin(locale);
  return { success: true as const };
}

export async function testStripeConnection() {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const { getStripe, resolveIntegrations, isStripeConfigured } = await import(
    "@/lib/platform-integrations"
  );
  const creds = await resolveIntegrations();
  if (!isStripeConfigured(creds)) {
    return { error: "NOT_CONFIGURED" as const };
  }

  const stripe = await getStripe();
  if (!stripe) return { error: "NOT_CONFIGURED" as const };

  try {
    await stripe.balance.retrieve();
    return { success: true as const, message: "Connexion Stripe OK" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Stripe";
    return { error: "STRIPE_ERROR" as const, message: msg };
  }
}

export async function testResendConnection() {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const { getResend, resolveIntegrations, isResendConfigured } = await import(
    "@/lib/platform-integrations"
  );
  const creds = await resolveIntegrations();
  if (!isResendConfigured(creds)) {
    return { error: "NOT_CONFIGURED" as const };
  }

  const resend = await getResend();
  if (!resend) return { error: "NOT_CONFIGURED" as const };

  try {
    const { data, error } = await resend.domains.list();
    if (error) return { error: "RESEND_ERROR" as const, message: error.message };
    const count = data?.data?.length ?? 0;
    return {
      success: true as const,
      message: `Connexion Resend OK (${count} domaine${count !== 1 ? "s" : ""})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Resend";
    return { error: "RESEND_ERROR" as const, message: msg };
  }
}

// ─── Fonctionnalités par club ────────────────────────────────────────────────

export async function updateClubFeatures(
  clubId: string,
  features: Partial<ClubFeatureSet>,
  locale: string
) {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  const ensured = await ensureClubFeatures(clubId);
  if (!ensured) return { error: "FEATURES_SCHEMA_MISMATCH" };
  await prisma.clubFeatures.update({
    where: { clubId },
    data: features,
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: user.id,
      action: "CLUB_FEATURES_UPDATED",
      entity: "ClubFeatures",
      entityId: clubId,
      metadata: features as object,
    },
  });

  revalidateAdmin(locale);
  return { success: true };
}

// ─── Annonces ────────────────────────────────────────────────────────────────

export async function sendAnnouncement(
  data: {
    title: string;
    message: string;
    targetType: "ALL_CLUBS" | "CLUB" | "USERS" | "ROLE";
    targetClubIds?: string[];
    targetUserIds?: string[];
    targetRoles?: ClubRole[];
    sendEmail?: boolean;
  },
  locale: string
) {
  const author = await admin();
  if (!author) return { error: "UNAUTHORIZED" };

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      message: data.message,
      targetType: data.targetType,
      targetClubIds: data.targetClubIds ?? [],
      targetUserIds: data.targetUserIds ?? [],
      targetRoles: data.targetRoles ?? [],
      sendEmail: data.sendEmail ?? false,
      authorId: author.id,
      sentAt: new Date(),
    },
  });

  let recipientIds: string[] = [];

  if (data.targetType === "ALL_CLUBS") {
    const memberships = await prisma.clubMembership.findMany({
      where: { isActive: true, club: { isActive: true } },
      select: { userId: true },
    });
    recipientIds = [...new Set(memberships.map((m) => m.userId))];
  } else if (data.targetType === "CLUB" && data.targetClubIds?.length) {
    const memberships = await prisma.clubMembership.findMany({
      where: { clubId: { in: data.targetClubIds }, isActive: true },
      select: { userId: true },
    });
    recipientIds = [...new Set(memberships.map((m) => m.userId))];
  } else if (data.targetType === "USERS" && data.targetUserIds?.length) {
    recipientIds = data.targetUserIds;
  } else if (data.targetType === "ROLE" && data.targetRoles?.length) {
    const memberships = await prisma.clubMembership.findMany({
      where: { role: { in: data.targetRoles }, isActive: true },
      select: { userId: true },
    });
    recipientIds = [...new Set(memberships.map((m) => m.userId))];
  }

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type: "ANNOUNCEMENT" as const,
        title: data.title,
        message: data.message,
        link: `/${locale}/notifications?tab=announcements`,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: author.id,
      action: "ANNOUNCEMENT_SENT",
      entity: "Announcement",
      entityId: announcement.id,
      metadata: { recipients: recipientIds.length, sendEmail: data.sendEmail },
    },
  });

  revalidateAdmin(locale);
  return { success: true, recipients: recipientIds.length };
}

// ─── Export statistiques ─────────────────────────────────────────────────────

export async function getPlatformExportData() {
  const user = await admin();
  if (!user) return { error: "UNAUTHORIZED" };

  const [clubs, users, subscriptions, minutes, meetings, members] = await Promise.all([
    prisma.club.count(),
    prisma.user.count(),
    prisma.subscription.groupBy({ by: ["plan", "status"], _count: true }),
    prisma.minute.groupBy({ by: ["status"], _count: true }),
    prisma.meeting.count(),
    prisma.member.count({ where: { isActive: true } }),
  ]);

  return {
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      clubs,
      users,
      subscriptions,
      minutes,
      meetings,
      members,
    },
  };
}