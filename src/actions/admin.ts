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

export async function updateClubSubscription(
  clubId: string,
  data: { plan?: SubscriptionPlan; status?: SubscriptionStatus },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" };

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { subscription: true },
  });
  if (!club) return { error: "NOT_FOUND" };

  if (club.subscription) {
    await prisma.subscription.update({
      where: { clubId },
      data: {
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        clubId,
        plan: data.plan ?? "TRIAL",
        status: data.status ?? "TRIALING",
        trialEndsAt: addDays(new Date(), 14),
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
      metadata: data as object,
    },
  });

  revalidatePath(`/${locale}/admin`);
  return { success: true };
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