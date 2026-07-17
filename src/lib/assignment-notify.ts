import { prisma } from "@/lib/prisma";
import { isEmailEnabled } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { getAppBaseUrl } from "@/lib/app-url";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";
import { sendPushToUser } from "@/lib/web-push";

type AssignmentKind = "action" | "project";

/**
 * Notify assigned members (and commission members) in-app, by email, and web-push.
 */
export async function notifyAssignment(opts: {
  clubId: string;
  kind: AssignmentKind;
  entityId: string;
  title: string;
  memberIds: string[];
  commissionId?: string | null;
  actorUserId?: string | null;
  locale?: string;
}) {
  const memberIds = new Set(opts.memberIds.filter(Boolean));

  if (opts.commissionId) {
    const memberships = await prisma.commissionMembership.findMany({
      where: { commissionId: opts.commissionId },
      select: { memberId: true },
    });
    for (const m of memberships) memberIds.add(m.memberId);

    // Legacy fallback
    const legacy = await prisma.member.findMany({
      where: { commissionId: opts.commissionId, isActive: true },
      select: { id: true },
    });
    for (const m of legacy) memberIds.add(m.id);
  }

  if (memberIds.size === 0) return { notified: 0 };

  const members = await prisma.member.findMany({
    where: {
      clubId: opts.clubId,
      id: { in: [...memberIds] },
      isActive: true,
      userId: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
    },
  });

  const club = await prisma.club.findUnique({
    where: { id: opts.clubId },
    select: { name: true, logoUrl: true, language: true },
  });
  if (!club) return { notified: 0 };

  const loc =
    opts.locale ??
    (club.language === "EN" ? "en" : club.language === "ES" ? "es" : "fr");
  const baseUrl = getAppBaseUrl();
  const path =
    opts.kind === "project"
      ? `/${loc}/projects/${opts.entityId}`
      : `/${loc}/actions`;
  const link = `${baseUrl}${path}`;

  const title =
    loc === "fr"
      ? opts.kind === "project"
        ? `Projet assigné — ${opts.title}`
        : `Tâche assignée — ${opts.title}`
      : loc === "es"
        ? opts.kind === "project"
          ? `Proyecto asignado — ${opts.title}`
          : `Tarea asignada — ${opts.title}`
        : opts.kind === "project"
          ? `Project assigned — ${opts.title}`
          : `Task assigned — ${opts.title}`;

  const message =
    loc === "fr"
      ? `Vous avez été assigné(e) à « ${opts.title} » sur ${club.name}.`
      : loc === "es"
        ? `Ha sido asignado/a a « ${opts.title} » en ${club.name}.`
        : `You have been assigned to “${opts.title}” on ${club.name}.`;

  let notified = 0;
  const emailOn = await isEmailEnabled();
  const emailLogo = resolveLogoForEmail(opts.clubId, club.logoUrl, baseUrl);

  for (const member of members) {
    if (!member.userId) continue;
    if (opts.actorUserId && member.userId === opts.actorUserId) continue;

    await prisma.notification.create({
      data: {
        userId: member.userId,
        clubId: opts.clubId,
        type: opts.kind === "project" ? "PROJECT_ASSIGNED" : "ACTION_ASSIGNED",
        title,
        message,
        link: path,
      },
    });

    try {
      await sendPushToUser({
        userId: member.userId,
        clubId: opts.clubId,
        payload: { title, body: message, url: path },
      });
    } catch {
      // push optional
    }

    if (emailOn && member.email) {
      try {
        const html = await prepareBrandedEmail(
          `<p>${message}</p><p><a href="${link}">${
            loc === "fr" ? "Ouvrir" : loc === "es" ? "Abrir" : "Open"
          }</a></p>`,
          {
            clubId: opts.clubId,
            clubName: club.name,
            logo: emailLogo,
          }
        );
        await sendClubEmail(opts.clubId, {
          to: member.email,
          subject: title,
          html: html.html,
          attachments: html.attachments,
        });
      } catch {
        // email optional
      }
    }

    notified++;
  }

  return { notified };
}
