import {
  differenceInCalendarDays,
  startOfDay,
  subHours,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { getClubFeatures } from "@/lib/features";
import type { NotificationFrequency, NotificationType } from "@/generated/prisma/client";

export type ReminderCategory =
  | "meetingReminders"
  | "duesReminders"
  | "actionReminders"
  | "birthdayReminders"
  | "eventReminders";

export interface UserReminderPrefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  meetingReminders: NotificationFrequency;
  duesReminders: NotificationFrequency;
  actionReminders: NotificationFrequency;
  birthdayReminders: NotificationFrequency;
  eventReminders: NotificationFrequency;
}

const DEFAULT_PREFS: UserReminderPrefs = {
  emailEnabled: true,
  inAppEnabled: true,
  meetingReminders: "IMMEDIATE",
  duesReminders: "IMMEDIATE",
  actionReminders: "IMMEDIATE",
  birthdayReminders: "WEEKLY",
  eventReminders: "IMMEDIATE",
};

export async function getUserReminderPrefs(
  userId: string,
  clubId: string | null
): Promise<UserReminderPrefs> {
  if (!clubId) return DEFAULT_PREFS;

  const clubFeatures = await getClubFeatures(clubId);
  if (!clubFeatures.smartNotificationsEnabled) return DEFAULT_PREFS;

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!prefs) return DEFAULT_PREFS;

  return {
    emailEnabled: prefs.emailEnabled,
    inAppEnabled: prefs.inAppEnabled,
    meetingReminders: prefs.meetingReminders,
    duesReminders: prefs.duesReminders,
    actionReminders: prefs.actionReminders,
    birthdayReminders: prefs.birthdayReminders,
    eventReminders: prefs.eventReminders,
  };
}

export function shouldSendByFrequency(
  frequency: NotificationFrequency,
  lastSentAt: Date | null | undefined,
  now = new Date()
): boolean {
  if (frequency === "OFF") return false;
  if (!lastSentAt) return true;

  const daysSince = differenceInCalendarDays(startOfDay(now), startOfDay(lastSentAt));

  switch (frequency) {
    case "IMMEDIATE":
      return daysSince >= 1;
    case "DAILY":
      return daysSince >= 1;
    case "WEEKLY":
      return daysSince >= 7;
    default:
      return true;
  }
}

export function getCategoryFrequency(
  prefs: UserReminderPrefs,
  category: ReminderCategory
): NotificationFrequency {
  return prefs[category];
}

export async function shouldDispatchReminder(opts: {
  userId: string;
  clubId: string;
  category: ReminderCategory;
  channel: "email" | "inApp";
  lastSentAt?: Date | null;
}): Promise<boolean> {
  const features = await getClubFeatures(opts.clubId);
  if (!features.smartNotificationsEnabled) return true;

  const prefs = await getUserReminderPrefs(opts.userId, opts.clubId);

  if (opts.channel === "email" && !prefs.emailEnabled) return false;
  if (opts.channel === "inApp" && !prefs.inAppEnabled) return false;

  const frequency = getCategoryFrequency(prefs, opts.category);
  return shouldSendByFrequency(frequency, opts.lastSentAt);
}

export async function wasRecentlyNotified(
  userId: string,
  type: NotificationType,
  link: string,
  hours = 24
): Promise<boolean> {
  const since = subHours(new Date(), hours);
  const existing = await prisma.notification.findFirst({
    where: { userId, type, link, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

export async function createInAppReminder(opts: {
  userId: string;
  clubId: string;
  category: ReminderCategory;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  lastSentAt?: Date | null;
}): Promise<"created" | "skipped"> {
  const allowed = await shouldDispatchReminder({
    userId: opts.userId,
    clubId: opts.clubId,
    category: opts.category,
    channel: "inApp",
    lastSentAt: opts.lastSentAt,
  });
  if (!allowed) return "skipped";

  if (await wasRecentlyNotified(opts.userId, opts.type, opts.link)) {
    return "skipped";
  }

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      clubId: opts.clubId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      link: opts.link,
    },
  });

  return "created";
}

export function isBirthdayInWindow(
  birthday: Date,
  now = new Date(),
  daysAhead = 7
): boolean {
  const today = startOfDay(now);
  const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
  const daysUntil = differenceInCalendarDays(thisYear, today);
  if (daysUntil >= 0 && daysUntil <= daysAhead) return true;

  const nextYear = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
  return differenceInCalendarDays(nextYear, today) <= daysAhead;
}

export async function processBirthdayReminders(): Promise<{
  checked: number;
  notifications: number;
  emails: number;
  skipped: number;
  checkedAt: string;
}> {
  const now = new Date();
  let notifications = 0;
  let emails = 0;
  let skipped = 0;

  const members = await prisma.member.findMany({
    where: { isActive: true, birthday: { not: null }, userId: { not: null } },
    include: {
      club: { select: { id: true, name: true, language: true, logoUrl: true } },
      user: { select: { id: true, email: true, firstName: true } },
    },
  });

  const { isEmailEnabled } = await import("@/lib/email");
  const { sendClubEmail } = await import("@/lib/club-smtp");

  const emailOn = await isEmailEnabled();

  for (const member of members) {
    if (!member.birthday || !member.userId) continue;

    const features = await getClubFeatures(member.clubId);
    if (!features.smartNotificationsEnabled) continue;

    if (!isBirthdayInWindow(member.birthday, now)) continue;

    const locale = member.club.language === "EN" ? "en" : "fr";
    const link = `/${locale}/members`;
    const title =
      locale === "fr"
        ? `Anniversaire à venir — ${member.firstName}`
        : `Upcoming birthday — ${member.firstName}`;
    const message =
      locale === "fr"
        ? `${member.firstName} ${member.lastName} fête son anniversaire bientôt.`
        : `${member.firstName} ${member.lastName} has a birthday coming up.`;

    const result = await createInAppReminder({
      userId: member.userId,
      clubId: member.clubId,
      category: "birthdayReminders",
      type: "BIRTHDAY_REMINDER",
      title,
      message,
      link,
    });

    if (result === "skipped") {
      skipped++;
      continue;
    }
    notifications++;

    const emailAllowed = await shouldDispatchReminder({
      userId: member.userId,
      clubId: member.clubId,
      category: "birthdayReminders",
      channel: "email",
    });

    if (emailOn && emailAllowed && member.user?.email) {
      const sent = await sendClubEmail(member.clubId, {
        to: member.user.email,
        subject: title,
        html: `<p>${message}</p><p><strong>${member.club.name}</strong></p>`,
      });
      if (sent.ok) emails++;
    }
  }

  return {
    checked: members.length,
    notifications,
    emails,
    skipped,
    checkedAt: now.toISOString(),
  };
}