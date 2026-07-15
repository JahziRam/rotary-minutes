"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requireFeature } from "@/lib/require-feature";
import type { NotificationFrequency } from "@/generated/prisma/client";

export type NotificationPrefsInput = {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  webPushEnabled?: boolean;
  meetingReminders?: NotificationFrequency;
  duesReminders?: NotificationFrequency;
  actionReminders?: NotificationFrequency;
  birthdayReminders?: NotificationFrequency;
  eventReminders?: NotificationFrequency;
};

const DEFAULT_PREFS = {
  emailEnabled: true,
  inAppEnabled: true,
  webPushEnabled: true,
  meetingReminders: "IMMEDIATE" as NotificationFrequency,
  duesReminders: "IMMEDIATE" as NotificationFrequency,
  actionReminders: "IMMEDIATE" as NotificationFrequency,
  birthdayReminders: "WEEKLY" as NotificationFrequency,
  eventReminders: "IMMEDIATE" as NotificationFrequency,
};

export async function getPreferences() {
  const feature = await requireFeature("smartNotificationsEnabled");
  if (feature.error) return { error: feature.error as string };
  const ctx = feature.ctx;

  const prefs = await prisma.notificationPreference.findUnique({
    where: {
      userId_clubId: { userId: ctx.userId, clubId: ctx.clubId },
    },
  });

  return {
    preferences: prefs
      ? {
          emailEnabled: prefs.emailEnabled,
          inAppEnabled: prefs.inAppEnabled,
          webPushEnabled: prefs.webPushEnabled,
          meetingReminders: prefs.meetingReminders,
          duesReminders: prefs.duesReminders,
          actionReminders: prefs.actionReminders,
          birthdayReminders: prefs.birthdayReminders,
          eventReminders: prefs.eventReminders,
        }
      : DEFAULT_PREFS,
  };
}

export async function updatePreferences(data: NotificationPrefsInput, locale = "fr") {
  const feature = await requireFeature("smartNotificationsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;

  await prisma.notificationPreference.upsert({
    where: {
      userId_clubId: { userId: ctx.userId, clubId: ctx.clubId },
    },
    create: {
      userId: ctx.userId,
      clubId: ctx.clubId,
      ...DEFAULT_PREFS,
      ...data,
    },
    update: data,
  });

  if (data.webPushEnabled === false) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: ctx.userId, clubId: ctx.clubId },
    });
  }

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings`);
  }
  revalidatePath(`/${locale}/settings`);

  return { success: true };
}