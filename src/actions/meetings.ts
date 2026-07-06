"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import type { MeetingType } from "@/generated/prisma/client";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import { sendEmail } from "@/lib/email";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { icsAttachment } from "@/lib/ics";

export async function createMeeting(
  data: Record<string, string>,
  locale: string
) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const typeMetadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      ["commissionName", "partnerClubs", "governor", "adg", "officialGuests"].includes(key) &&
      value
    ) {
      typeMetadata[key] = value;
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      clubId: ctx.clubId,
      date: new Date(data.date),
      location: data.location || ctx.club.meetingLocation,
      startTime: data.startTime || ctx.club.meetingTime,
      endTime: data.endTime || undefined,
      presidedBy: data.presidedBy || ctx.club.presidentName,
      secretary: data.secretary || ctx.club.secretaryName,
      type: (data.type as MeetingType) || "STATUTORY",
      typeMetadata: Object.keys(typeMetadata).length ? typeMetadata : undefined,
    },
  });

  const meetingType = (data.type as MeetingType) || "STATUTORY";
  const templateItems = await getAgendaTemplateForMeeting(meetingType, locale, ctx.clubId);

  await prisma.minute.create({
    data: {
      clubId: ctx.clubId,
      meetingId: meeting.id,
      title: `PV — ${new Date(data.date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}`,
      authorId: ctx.userId,
      agendaItems: {
        create: templateItems.map((item, i) => ({
          sortOrder: i,
          title: item.title,
          description: item.description ?? null,
          status: (item.status ?? "OPEN") as "OPEN",
        })),
      },
    },
  });

  if (ctx.club.email) {
    const ics = icsAttachment({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      location: meeting.location,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      clubName: ctx.club.name,
    });
    const { getAppBaseUrl } = await import("@/lib/app-url");
    const baseUrl = getAppBaseUrl();
    const body =
      locale === "fr"
        ? `<p>Réunion planifiée le ${new Date(data.date).toLocaleDateString("fr-FR")}.</p>`
        : `<p>Meeting scheduled on ${new Date(data.date).toLocaleDateString("en-GB")}.</p>`;
    const branded = prepareBrandedEmail(body, {
      clubName: ctx.club.name,
      clubId: ctx.club.id,
      logoUrl: ctx.club.logoUrl,
      baseUrl,
    });
    await sendEmail({
      to: ctx.club.email,
      subject:
        locale === "fr"
          ? `Convocation — ${ctx.club.name}`
          : `Meeting invitation — ${ctx.club.name}`,
      html: branded.html,
      attachments: [...(branded.attachments ?? []), ics],
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEETING_CREATED",
      entity: "Meeting",
      entityId: meeting.id,
    },
  });

  const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
  void dispatchClubWebhook(ctx.clubId, "MEETING_CREATED", {
    meetingId: meeting.id,
    date: meeting.date.toISOString(),
    type: meeting.type,
    location: meeting.location,
  });

  revalidatePath(`/${locale}/meetings`);
  revalidatePath(`/${locale}/dashboard`);

  redirect(`/${locale}/meetings/${meeting.id}/attendance`);
}

export async function getLastMeetingDefaults(clubId: string) {
  const last = await prisma.meeting.findFirst({
    where: { clubId },
    orderBy: { date: "desc" },
  });
  return last;
}