import { NextResponse } from "next/server";
import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { duesInvoiceEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { buildDuesInvoicePdfBuffer } from "@/lib/pdf/build-dues-pdf";
import { nextInvoiceNumber } from "@/lib/dues";
import { getClubFeatures } from "@/lib/features";
import {
  createInAppReminder,
  shouldDispatchReminder,
} from "@/lib/smart-reminders";

import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

const REMINDER_DAYS = [7, 3, 1] as const;
const REMIND_COOLDOWN_DAYS = 3;

function shouldRemind(dueDate: Date, now: Date): boolean {
  const daysUntil = differenceInCalendarDays(startOfDay(dueDate), startOfDay(now));
  if (daysUntil < 0) return true;
  return REMINDER_DAYS.includes(daysUntil as (typeof REMINDER_DAYS)[number]);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const cooldownCutoff = subDays(now, REMIND_COOLDOWN_DAYS);
  await prisma.memberDues.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  const candidates = await prisma.memberDues.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { lte: addDays(today, 7) },
      OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: cooldownCutoff } }],
    },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
      club: { select: { id: true, name: true, logoUrl: true, language: true } },
    },
  });

  let emailsSent = 0;
  let notificationsCreated = 0;
  let reminded = 0;

  for (const dues of candidates) {
    if (!shouldRemind(dues.dueDate, now)) continue;

    const features = await getClubFeatures(dues.clubId);
    if (!features.duesEnabled) continue;

    const locale = dues.club.language === "EN" ? "en" : "fr";
    const dateLocale = locale === "fr" ? fr : enUS;

    const emailAllowed = dues.member.userId
      ? await shouldDispatchReminder({
          userId: dues.member.userId,
          clubId: dues.clubId,
          category: "duesReminders",
          channel: "email",
          lastSentAt: dues.lastRemindedAt,
        })
      : true;

    if (dues.member.email && emailAllowed) {
      let invoiceNumber = dues.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await nextInvoiceNumber(dues.clubId, dues.fiscalYear);
        await prisma.memberDues.update({
          where: { id: dues.id },
          data: { invoiceNumber },
        });
      }

      const clubFull = await prisma.club.findUnique({
        where: { id: dues.clubId },
        select: {
          id: true,
          name: true,
          address: true,
          meetingLocation: true,
          logoUrl: true,
          language: true,
        },
      });

      const duesWithInvoice = { ...dues, invoiceNumber };
      const pdf =
        clubFull &&
        (await buildDuesInvoicePdfBuffer(clubFull, dues.member, duesWithInvoice, locale));

      const mail = duesInvoiceEmail({
        clubName: dues.club.name,
        clubId: dues.club.id,
        memberName: `${dues.member.firstName} ${dues.member.lastName}`,
        periodLabel: dues.periodLabel ?? `${dues.fiscalYear}-${dues.fiscalYear + 1}`,
        amount: `${Number(dues.amount)} ${dues.currency}`,
        dueDate: format(dues.dueDate, "d MMMM yyyy", { locale: dateLocale }),
        locale,
        logoUrl: dues.club.logoUrl ?? undefined,
      });

      const result = await sendClubEmail(dues.club.id, {
        to: dues.member.email,
        subject: mail.subject,
        html: mail.html,
        attachments: [
          ...(mail.attachments ?? []),
          ...(pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : []),
        ],
      });
      if (result.ok) emailsSent++;
    }

    if (dues.member.userId) {
      const daysUntil = differenceInCalendarDays(startOfDay(dues.dueDate), today);
      const isOverdue = daysUntil < 0;
      const title =
        locale === "fr"
          ? isOverdue
            ? "Cotisation en retard"
            : "Rappel de cotisation"
          : isOverdue
            ? "Overdue dues"
            : "Dues reminder";
      const message =
        locale === "fr"
          ? isOverdue
            ? `Votre cotisation ${dues.fiscalYear}-${dues.fiscalYear + 1} est en retard.`
            : `Votre cotisation ${dues.fiscalYear}-${dues.fiscalYear + 1} est due le ${dues.dueDate.toLocaleDateString("fr-FR")}.`
          : isOverdue
            ? `Your ${dues.fiscalYear}-${dues.fiscalYear + 1} dues are overdue.`
            : `Your ${dues.fiscalYear}-${dues.fiscalYear + 1} dues are due on ${dues.dueDate.toLocaleDateString("en-US")}.`;

      const result = await createInAppReminder({
        userId: dues.member.userId,
        clubId: dues.clubId,
        category: "duesReminders",
        type: "DUES_REMINDER",
        title,
        message,
        link: `/${locale}/members/dues`,
        lastSentAt: dues.lastRemindedAt,
      });
      if (result === "created") notificationsCreated++;
    }

    await prisma.memberDues.update({
      where: { id: dues.id },
      data: { lastRemindedAt: now },
    });
    reminded++;
  }

  return NextResponse.json({
    reminded,
    emailsSent,
    notificationsCreated,
    checkedAt: now.toISOString(),
  });
}