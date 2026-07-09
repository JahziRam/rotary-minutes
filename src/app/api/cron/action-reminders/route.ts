import { NextResponse } from "next/server";
import { subDays, startOfDay, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getClubFeatures } from "@/lib/features";
import { getOverdueActionsForReminders } from "@/lib/queries/club-actions";
import { getAppBaseUrl } from "@/lib/app-url";
import { isEmailEnabled } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";
import { buildClubEmailVars, renderEmailContent } from "@/lib/email-render";
import { ensureEmailSystemTemplates, SYSTEM_EMAIL_TEMPLATES } from "@/lib/email-system-templates";

const REMIND_COOLDOWN_DAYS = 3;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cooldownCutoff = subDays(now, REMIND_COOLDOWN_DAYS);
  const today = startOfDay(now);
  const emailOn = await isEmailEnabled();
  await ensureEmailSystemTemplates();

  const actions = await getOverdueActionsForReminders(cooldownCutoff);

  let reminded = 0;
  let emailsSent = 0;
  let notificationsCreated = 0;

  for (const action of actions) {
    const features = await getClubFeatures(action.clubId);
    if (!features.actionsEnabled) continue;

    const locale = action.club.language === "EN" ? "en" : "fr";
    const dateLocale = locale === "fr" ? fr : enUS;
    const link = `/${locale}/actions`;
    const responsible =
      action.responsibleMember
        ? `${action.responsibleMember.firstName} ${action.responsibleMember.lastName}`
        : action.responsibleName ?? (locale === "fr" ? "Non assigné" : "Unassigned");
    const dueStr = action.dueDate
      ? format(action.dueDate, "d MMMM yyyy", { locale: dateLocale })
      : locale === "fr"
        ? "Non définie"
        : "Not set";

    const isOverdue = action.dueDate && action.dueDate < today;
    if (!isOverdue && action.dueDate) continue;

    const title =
      locale === "fr" ? `Action en retard — ${action.title}` : `Overdue action — ${action.title}`;
    const message =
      locale === "fr"
        ? `Échéance : ${dueStr} · Responsable : ${responsible}`
        : `Due: ${dueStr} · Owner: ${responsible}`;

    if (action.responsibleMember?.userId) {
      await prisma.notification.create({
        data: {
          userId: action.responsibleMember.userId,
          clubId: action.clubId,
          type: "ACTION_REMINDER",
          title,
          message,
          link,
        },
      });
      notificationsCreated++;
    }

    if (emailOn && action.responsibleMember?.email) {
      const baseUrl = getAppBaseUrl();
      const emailLogo = resolveLogoForEmail(action.clubId, action.club.logoUrl, baseUrl);
      const systemTpl = SYSTEM_EMAIL_TEMPLATES.find((t) => t.slug === "action-deadline-reminder");
      const dbTpl = await prisma.emailTemplate.findFirst({
        where: { slug: `action-deadline-reminder-${locale}`, clubId: null, isSystem: true },
      });
      const subjectTpl = dbTpl?.subject ?? systemTpl?.subject[locale];
      const bodyTpl = dbTpl?.body ?? systemTpl?.body[locale];

      if (subjectTpl && bodyTpl) {
        const vars = buildClubEmailVars({
          clubName: action.club.name,
          locale,
          clubLogo: logoSrcFromResult(emailLogo) ?? "",
          firstName: action.responsibleMember.firstName,
          lastName: action.responsibleMember.lastName,
          actionTitle: action.title,
          actionDueDate: dueStr,
          actionResponsible: responsible,
          dashboardUrl: `${baseUrl}/${locale}/actions`,
        });
        const branded = prepareBrandedEmail(renderEmailContent(bodyTpl, vars), {
          clubName: action.club.name,
          logo: emailLogo,
        });
        const result = await sendClubEmail(action.club.id, {
          to: action.responsibleMember.email,
          subject: renderEmailContent(subjectTpl, vars),
          html: branded.html,
          attachments: branded.attachments,
        });
        if (result.ok) emailsSent++;
      }
    }

    await prisma.clubAction.update({
      where: { id: action.id },
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