"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import {
  hasPushOnboardingDecision,
  isWebPushEnabledForUser,
  setWebPushEnabledForUser,
} from "@/lib/push-preference";

function revalidatePushPaths() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/my-account`);
    revalidatePath(`/${loc}/notifications`);
    revalidatePath(`/${loc}/dashboard`);
  }
}

export async function getWebPushPreference() {
  const ctx = await getClubContext();
  if (!ctx) return { enabled: false as const };

  const enabled = await isWebPushEnabledForUser(ctx.userId, ctx.clubId);
  return { enabled };
}

export async function getPushOnboardingPending() {
  const ctx = await getClubContext();
  if (!ctx) return { pending: false as const };

  const decided = await hasPushOnboardingDecision(ctx.userId, ctx.clubId);
  return { pending: !decided };
}

export async function completePushOnboarding(enabled: boolean) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  await setWebPushEnabledForUser(ctx.userId, ctx.clubId, enabled);
  revalidatePushPaths();
  return { success: true as const };
}

export async function setWebPushPreference(enabled: boolean) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  await setWebPushEnabledForUser(ctx.userId, ctx.clubId, enabled);
  revalidatePushPaths();
  return { success: true as const };
}

export async function savePushSubscription(data: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  if (!data.endpoint?.trim() || !data.p256dh?.trim() || !data.auth?.trim()) {
    return { error: "INVALID" as const };
  }

  await setWebPushEnabledForUser(ctx.userId, ctx.clubId, true);

  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: {
      userId: ctx.userId,
      clubId: ctx.clubId,
      p256dh: data.p256dh,
      auth: data.auth,
    },
    create: {
      userId: ctx.userId,
      clubId: ctx.clubId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    },
  });

  revalidatePushPaths();
  return { success: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: ctx.userId },
  });

  revalidatePushPaths();
  return { success: true as const };
}