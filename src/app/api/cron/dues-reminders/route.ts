import { NextResponse } from "next/server";
import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/app-url";
import { buildClubEmailVars, renderEmailContent } from "@/lib/email-render";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";
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
  const baseUrl = getAppBaseUrl();

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

    const locale = dues.club.language === "EN" ? "en" : "fr";
    const dateLocale = locale === "fr" ? fr : enUS;
    const emailLogo = resolveLogoForEmail(dues.club.id, dues.club.logoUrl, baseUrl);
    const vars = buildClubEmailVars({
      clubName: dues.club.name,
      locale,
      clubLogo: logoSrcFromResult(emailLogo) ?? "",
      firstName: dues.member.firstName,
      lastName: dues.member.lastName,
      dashboardUrl: `${baseUrl}/${locale}/members/dues`,
      duesAmount: `${Number(dues.amount)} ${dues.currency}`,
      duesDueDate: format(dues.dueDate, "d MMMM yyyy", { locale: dateLocale }),
      fiscalYear: String(dues.fiscalYear),
    });

    const template = await prisma.emailTemplate.findFirst({
      where: { slug: `dues-reminder-${locale}`, clubId: null, isSystem: true },
    });

    if (dues.member.email && template) {
      const subject = renderEmailContent(template.subject, vars);
      const bodyHtml = renderEmailContent(template.body, vars);
      const branded = prepareBrandedEmail(bodyHtml, {
        clubName: dues.club.name,
        logo: emailLogo,
      });

      const result = await sendEmail({
        to: dues.member.email,
        subject,
        html: branded.html,
        attachments: branded.attachments,
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

      await prisma.notification.create({
        data: {
          userId: dues.member.userId,
          clubId: dues.clubId,
          type: "DUES_REMINDER",
          title,
          message,
          link: `/${locale}/members/dues`,
        },
      });
      notificationsCreated++;
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