import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  subDays,
  subHours,
} from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/app-url";
import { isEmailEnabled } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";
import { buildClubEmailVars, renderEmailContent } from "@/lib/email-render";
import {
  ensureEmailSystemTemplates,
  SYSTEM_EMAIL_TEMPLATES,
} from "@/lib/email-system-templates";

import type { NotificationType } from "@/generated/prisma/client";
import { createInAppReminder, shouldDispatchReminder } from "@/lib/smart-reminders";
import {
  buildWhatsAppLink,
  meetingReminderWhatsAppMessage,
} from "@/lib/whatsapp";

const MEETING_REMINDER_DAYS = [7, 3, 1] as const;
const PV_REMINDER_DAYS_AGO = [1, 2, 3] as const;
const PV_48H_EMAIL_DAYS = 2;
const OFFICER_ROLES = ["ADMIN", "PRESIDENT", "VICE_PRESIDENT", "SECRETARY"] as const;

export interface ReminderRunResult {
  notifications: number;
  emails: number;
  skipped: number;
  checkedAt: string;
}

async function wasRecentlyNotified(
  userId: string,
  type: NotificationType,
  link: string
): Promise<boolean> {
  const since = subHours(new Date(), 24);
  const existing = await prisma.notification.findFirst({
    where: { userId, type, link, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!existing;
}

function clubLocale(language: string): "fr" | "en" {
  return language === "EN" ? "en" : "fr";
}

async function getMeetingReminderTemplate(locale: "fr" | "en") {
  await ensureEmailSystemTemplates();
  const slug = `meeting-reminder-${locale}`;
  const dbTpl = await prisma.emailTemplate.findFirst({
    where: { slug, clubId: null, isSystem: true },
  });
  if (dbTpl) return { subject: dbTpl.subject, body: dbTpl.body };

  const system = SYSTEM_EMAIL_TEMPLATES.find((t) => t.slug === "meeting-reminder");
  return {
    subject: system!.subject[locale],
    body: system!.body[locale],
  };
}

async function notifyUser(opts: {
  userId: string;
  clubId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}): Promise<"created" | "skipped"> {
  return createInAppReminder({
    userId: opts.userId,
    clubId: opts.clubId,
    category: "meetingReminders",
    type: opts.type,
    title: opts.title,
    message: opts.message,
    link: opts.link,
  });
}

export async function processMeetingReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const today = startOfDay(now);
  const baseUrl = getAppBaseUrl();
  const emailOn = await isEmailEnabled();

  let notifications = 0;
  let emails = 0;
  let skipped = 0;

  const meetings = await prisma.meeting.findMany({
    where: {
      date: {
        gte: today,
        lte: addDays(today, 7),
      },
    },
    include: {
      club: {
        include: {
          memberships: {
            where: {
              role: { in: [...OFFICER_ROLES] },
              isActive: true,
            },
            include: { user: true },
          },
        },
      },
    },
  });

  for (const meeting of meetings) {
    const daysLeft = differenceInCalendarDays(startOfDay(meeting.date), today);
    if (!MEETING_REMINDER_DAYS.includes(daysLeft as (typeof MEETING_REMINDER_DAYS)[number])) {
      continue;
    }

    const locale = clubLocale(meeting.club.language);
    const dateLocale = locale === "fr" ? fr : enUS;
    const meetingDateStr = format(meeting.date, "EEEE d MMMM yyyy", { locale: dateLocale });
    const link = `/${locale}/meetings/${meeting.id}/attendance`;
    const tpl = await getMeetingReminderTemplate(locale);

    const title =
      locale === "fr"
        ? `Réunion dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
        : `Meeting in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
    const message =
      locale === "fr"
        ? `${meeting.club.name} — ${meetingDateStr}${meeting.location ? ` · ${meeting.location}` : ""}`
        : `${meeting.club.name} — ${meetingDateStr}${meeting.location ? ` · ${meeting.location}` : ""}`;

    if (meeting.club.whatsappReminderPhone) {
      const checkInUrl = `${baseUrl}/${locale}/check-in`;
      const waMessage = meetingReminderWhatsAppMessage({
        clubName: meeting.club.name,
        meetingTitle: meeting.title ?? (locale === "fr" ? "Réunion" : "Meeting"),
        dateStr: meetingDateStr,
        location: meeting.location,
        checkInUrl,
        locale,
      });
      const waLink = buildWhatsAppLink(meeting.club.whatsappReminderPhone, waMessage);
      console.info(
        `[reminders] WhatsApp reminder for meeting ${meeting.id}:`,
        waLink
      );
      await prisma.auditLog.create({
        data: {
          clubId: meeting.clubId,
          action: "MEETING_WHATSAPP_REMINDER",
          entity: "Meeting",
          entityId: meeting.id,
          metadata: { whatsappLink: waLink, daysLeft },
        },
      });
    }

    for (const membership of meeting.club.memberships) {
      const result = await notifyUser({
        userId: membership.userId,
        clubId: meeting.clubId,
        type: "MEETING_REMINDER",
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
        userId: membership.userId,
        clubId: meeting.clubId,
        category: "meetingReminders",
        channel: "email",
      });

      if (emailOn && emailAllowed && membership.user.email) {
        const emailLogo = resolveLogoForEmail(
          meeting.club.id,
          meeting.club.logoUrl,
          baseUrl
        );
        const vars = buildClubEmailVars({
          clubName: meeting.club.name,
          locale,
          clubLogo: logoSrcFromResult(emailLogo) ?? "",
          firstName: membership.user.firstName ?? undefined,
          lastName: membership.user.lastName ?? undefined,
          meetingDate: meetingDateStr,
          meetingLocation: meeting.location ?? (locale === "fr" ? "À confirmer" : "TBC"),
          dashboardUrl: `${baseUrl}/${locale}/dashboard`,
        });
        const subject = renderEmailContent(tpl.subject, vars);
        const bodyHtml = renderEmailContent(tpl.body, vars);
        const branded = await prepareBrandedEmail(bodyHtml, {
          clubId: meeting.club.id,
          clubName: meeting.club.name,
          logo: emailLogo,
        });

        const sent = await sendClubEmail(meeting.club.id, {
          to: membership.user.email,
          subject,
          html: branded.html,
          attachments: branded.attachments,
        });
        if (sent.ok) emails++;
      }
    }
  }

  return {
    notifications,
    emails,
    skipped,
    checkedAt: now.toISOString(),
  };
}

export async function processPvReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const today = startOfDay(now);

  let notifications = 0;
  let emails = 0;
  let skipped = 0;

  const minutes = await prisma.minute.findMany({
    where: {
      status: { in: ["DRAFT", "IN_PROGRESS"] },
      meeting: {
        date: {
          gte: subDays(today, 3),
          lt: today,
        },
      },
    },
    include: {
      club: true,
      meeting: true,
      agendaItems: { select: { actions: true } },
    },
  });

  for (const minute of minutes) {
    const daysAgo = differenceInCalendarDays(today, startOfDay(minute.meeting.date));
    if (!PV_REMINDER_DAYS_AGO.includes(daysAgo as (typeof PV_REMINDER_DAYS_AGO)[number])) {
      continue;
    }

    const locale = clubLocale(minute.club.language);
    const dateLocale = locale === "fr" ? fr : enUS;
    const meetingDateStr = format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale });
    const link = `/${locale}/minutes/${minute.id}/edit`;

    const hasOpenActions = minute.agendaItems.some((item) => !!item.actions?.trim());
    const type: NotificationType = hasOpenActions ? "ACTION_REMINDER" : "MEETING_REMINDER";

    const title =
      locale === "fr"
        ? daysAgo === 1
          ? "PV à finaliser — réunion hier"
          : `PV en attente — réunion il y a ${daysAgo} jours`
        : daysAgo === 1
          ? "Minutes pending — meeting yesterday"
          : `Minutes pending — meeting ${daysAgo} days ago`;
    const message =
      locale === "fr"
        ? `${minute.title} (${meetingDateStr})`
        : `${minute.title} (${meetingDateStr})`;

    const secretaries = await prisma.clubMembership.findMany({
      where: {
        clubId: minute.clubId,
        role: { in: ["SECRETARY", "PROTOCOL"] },
        isActive: true,
      },
      include: { user: true },
    });

    const recipients =
      secretaries.length > 0
        ? secretaries
        : await prisma.clubMembership.findMany({
            where: {
              clubId: minute.clubId,
              role: { in: ["ADMIN", "PRESIDENT", "VICE_PRESIDENT"] },
              isActive: true,
            },
            include: { user: true },
          });

    for (const membership of recipients) {
      const result = await notifyUser({
        userId: membership.userId,
        clubId: minute.clubId,
        type,
        title,
        message,
        link,
      });

      if (result === "skipped") {
        skipped++;
        continue;
      }
      notifications++;

      if (daysAgo === PV_48H_EMAIL_DAYS && membership.user.email && (await isEmailEnabled())) {
        const { sendClubEmail } = await import("@/lib/club-smtp");
        const emailTitle =
          locale === "fr"
            ? "Rappel : PV non finalisé depuis 48h"
            : "Reminder: minutes not finalized for 48h";
        const body =
          locale === "fr"
            ? `<p>Le procès-verbal <strong>${minute.title}</strong> (${meetingDateStr}) n'est pas encore finalisé.</p><p><a href="${getAppBaseUrl()}${link}">Ouvrir le PV</a></p>`
            : `<p>The minutes <strong>${minute.title}</strong> (${meetingDateStr}) are not finalized yet.</p><p><a href="${getAppBaseUrl()}${link}">Open minutes</a></p>`;
        const sent = await sendClubEmail(minute.clubId, {
          to: membership.user.email,
          subject: emailTitle,
          html: body,
        });
        if (sent.ok) emails++;
      }
    }
  }

  return {
    notifications,
    emails,
    skipped,
    checkedAt: now.toISOString(),
  };
}