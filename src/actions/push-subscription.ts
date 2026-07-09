"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";

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

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings`);
  }

  return { success: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: ctx.userId },
  });

  return { success: true as const };
}