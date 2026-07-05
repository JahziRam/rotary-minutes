"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function revalidateNotifications(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/notifications`);
    revalidatePath(`/${loc}/dashboard`);
  }
  revalidatePath(`/${locale}/notifications`);
}

export async function markNotificationsRead(locale: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidateNotifications(locale);
  return { success: true };
}

export async function markNotificationRead(notificationId: string, locale: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });

  revalidateNotifications(locale);
  return { success: true };
}

export async function markAnnouncementNotificationsRead(locale: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, type: "ANNOUNCEMENT", isRead: false },
    data: { isRead: true },
  });

  revalidateNotifications(locale);
  return { success: true };
}