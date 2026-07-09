"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { requireFeature } from "@/lib/require-feature";
import { dispatchCampaign } from "@/actions/emails";
import { buildMinuteAttendanceAnnex } from "@/lib/minute-attendance-annex";
import { attendanceWithMemberInclude } from "@/lib/pdf/build-minute-pdf";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

/** Crée une campagne newsletter à partir d'un PV finalisé. */
export async function createNewsletterFromMinute(minuteId: string, locale = "fr") {
  const feature = await requireFeature("emailsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("emails.send");
  if (auth.error) return auth;
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId, status: "FINALIZED" },
    include: {
      club: true,
      agendaItems: { orderBy: { sortOrder: "asc" } },
      meeting: { include: { attendances: attendanceWithMemberInclude } },
    },
  });
  if (!minute) return { error: "NOT_FOUND" as const };

  const isFr = locale !== "en";
  const dateLocale = isFr ? fr : enUS;
  const dateStr = format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale });
  const annex = buildMinuteAttendanceAnnex(
    minute.meeting.attendances.map((a) => ({
      category: a.category,
      guestName: a.guestName,
      member: a.member,
    })),
    locale
  );

  const agendaHtml = minute.agendaItems
    .map((item, i) => {
      const parts = [`<p><strong>${i + 1}. ${item.title}</strong></p>`];
      if (item.decisions) parts.push(`<p>${item.decisions}</p>`);
      if (item.actions) parts.push(`<p><em>Action : ${item.actions}</em></p>`);
      return parts.join("");
    })
    .join("");

  const body = `
<p>${isFr ? "Bonjour," : "Hello,"}</p>
<p>${isFr ? `Voici le résumé du procès-verbal du ${dateStr} — <strong>${minute.club.name}</strong>.` : `Here is the summary of the minutes from ${dateStr} — <strong>${minute.club.name}</strong>.`}</p>
${minute.freeText ? `<p>${minute.freeText.replace(/\n/g, "<br/>")}</p>` : ""}
<h3>${isFr ? "Ordre du jour" : "Agenda"}</h3>
${agendaHtml}
<p><small>${isFr ? `Présents : ${annex.totalMembers} · Visiteurs : ${annex.totalVisitors}` : `Present: ${annex.totalMembers} · Visitors: ${annex.totalVisitors}`}</small></p>
`;

  const campaign = await prisma.emailCampaign.create({
    data: {
      clubId: ctx.clubId,
      name: isFr ? `Newsletter PV — ${dateStr}` : `Minutes newsletter — ${dateStr}`,
      subject: isFr
        ? `PV du ${dateStr} — ${minute.club.name}`
        : `Minutes ${dateStr} — ${minute.club.name}`,
      body,
      status: "DRAFT",
      recipients: [],
    },
  });

  const group = await prisma.emailGroup.findFirst({
    where: { clubId: ctx.clubId, name: { in: ["Membres", "Members", "membres"] } },
  });

  if (group) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { groupId: group.id },
    });
  }

  return {
    success: true as const,
    campaignId: campaign.id,
    preview: body,
    message: isFr
      ? "Campagne créée — vérifiez et envoyez depuis Emails > Campagnes"
      : "Campaign created — review and send from Emails > Campaigns",
  };
}