"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;
  return session.user;
}

export async function toggleClubActive(clubId: string, locale: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" };

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { error: "NOT_FOUND" };

  const isActive = !club.isActive;
  await prisma.club.update({ where: { id: clubId }, data: { isActive } });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: isActive ? "CLUB_ACTIVATED" : "CLUB_DEACTIVATED",
      entity: "Club",
      entityId: clubId,
      metadata: { clubName: club.name },
    },
  });

  revalidatePath(`/${locale}/admin`);
  return { success: true, isActive };
}

const ALL_PLANS: SubscriptionPlan[] = [
  "TRIAL",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];
const ALL_STATUSES: SubscriptionStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
];

function defaultStatusForPlan(plan: SubscriptionPlan): SubscriptionStatus {
  return plan === "TRIAL" ? "TRIALING" : "ACTIVE";
}

/**
 * Super admin : change le forfait (et optionnellement le statut) d'un club.
 * Synchronise les modules du forfait et journalise l'action.
 */
export async function updateClubSubscription(
  clubId: string,
  data: { plan?: SubscriptionPlan; status?: SubscriptionStatus },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  if (data.plan && !ALL_PLANS.includes(data.plan)) {
    return { error: "INVALID_PLAN" as const };
  }
  if (data.status && !ALL_STATUSES.includes(data.status)) {
    return { error: "INVALID_STATUS" as const };
  }
  if (!data.plan && !data.status) {
    return { error: "NO_CHANGE" as const };
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { subscription: true },
  });
  if (!club) return { error: "NOT_FOUND" as const };

  const nextPlan = data.plan ?? club.subscription?.plan ?? "TRIAL";
  // If plan changes without explicit status, pick a sensible default
  const nextStatus =
    data.status ??
    (data.plan
      ? defaultStatusForPlan(data.plan)
      : (club.subscription?.status ?? defaultStatusForPlan(nextPlan)));

  const patch: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialEndsAt?: Date | null;
    cancelledAt?: Date | null;
  } = {
    plan: nextPlan,
    status: nextStatus,
  };

  if (nextPlan === "TRIAL" || nextStatus === "TRIALING") {
    const existingTrial = club.subscription?.trialEndsAt;
    patch.trialEndsAt =
      existingTrial && existingTrial > new Date()
        ? existingTrial
        : addDays(new Date(), 14);
  } else if (data.plan && data.plan !== "TRIAL") {
    // Leaving trial for a paid plan: clear trial end
    patch.trialEndsAt = null;
  }

  if (nextStatus === "ACTIVE") {
    patch.cancelledAt = null;
  } else if (nextStatus === "CANCELLED" && !club.subscription?.cancelledAt) {
    patch.cancelledAt = new Date();
  }

  if (club.subscription) {
    await prisma.subscription.update({
      where: { clubId },
      data: patch,
    });
  } else {
    await prisma.subscription.create({
      data: {
        clubId,
        plan: patch.plan,
        status: patch.status,
        trialEndsAt: patch.trialEndsAt ?? addDays(new Date(), 14),
        cancelledAt: patch.cancelledAt ?? null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: "SUBSCRIPTION_UPDATED",
      entity: "Subscription",
      entityId: clubId,
      metadata: {
        from: club.subscription
          ? { plan: club.subscription.plan, status: club.subscription.status }
          : null,
        to: { plan: nextPlan, status: nextStatus },
        byAdmin: admin.id,
      },
    },
  });

  const { syncClubFeaturesFromPlan } = await import("@/lib/features");
  await syncClubFeaturesFromPlan(clubId, nextPlan);

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/admin`);
    revalidatePath(`/${loc}/admin/clubs`);
    revalidatePath(`/${loc}/admin/subscriptions`);
    revalidatePath(`/${loc}/settings/subscription`);
    revalidatePath(`/${loc}/dashboard`);
  }
  revalidatePath(`/${locale}/admin/clubs`);

  return {
    success: true as const,
    plan: nextPlan,
    status: nextStatus,
  };
}

export async function extendClubTrial(clubId: string, days: number, locale: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" };

  const sub = await prisma.subscription.findUnique({ where: { clubId } });
  if (!sub) return { error: "NOT_FOUND" };

  const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
  const trialEndsAt = addDays(base, days);

  await prisma.subscription.update({
    where: { clubId },
    data: { trialEndsAt, status: "TRIALING", plan: "TRIAL" },
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: "TRIAL_EXTENDED",
      entity: "Subscription",
      entityId: clubId,
      metadata: { days, trialEndsAt: trialEndsAt.toISOString() },
    },
  });

  revalidatePath(`/${locale}/admin`);
  return { success: true, trialEndsAt: trialEndsAt.toISOString() };
}