"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import type { MeetingType } from "@/generated/prisma/client";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import { sendClubEmail } from "@/lib/club-smtp";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { icsAttachment } from "@/lib/ics";
import { isFeatureEnabled } from "@/lib/feature-gate";
import {
  assertCommissionChairHasCommission,
  assertCommissionMeetingAccess,
  applyMeetingScopeToWhere,
  isCommissionChairRole,
} from "@/lib/commission-scope";

/** Parse YYYY-MM-DD as local calendar date (noon) to avoid UTC day-shift.
 *  Must stay non-exported: "use server" files may only export async actions. */
function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  return new Date(dateStr);
}

function revalidateMeetingPaths(locale: string, meetingId?: string) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/meetings`);
    revalidatePath(`/${loc}/dashboard`);
    if (meetingId) {
      revalidatePath(`/${loc}/meetings/${meetingId}/attendance`);
      revalidatePath(`/${loc}/meetings/${meetingId}/live`);
    }
  }
  revalidatePath(`/${locale}/meetings`);
}

export type AgendaDraftItem = {
  title: string;
  description?: string | null;
  status?: string;
};

function parseAgendaFromForm(data: Record<string, string>): AgendaDraftItem[] | null {
  const raw = data.agendaItems?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items: AgendaDraftItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) continue;
      items.push({
        title,
        description:
          typeof row.description === "string" && row.description.trim()
            ? row.description.trim()
            : null,
        status: typeof row.status === "string" ? row.status : "OPEN",
      });
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/** Returns the agenda template for a meeting type (club/district/system). */
export async function fetchAgendaTemplate(meetingType: string, locale: string) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error, items: [] as AgendaDraftItem[] };
  const type = (meetingType as MeetingType) || "STATUTORY";
  const items = await getAgendaTemplateForMeeting(type, locale, auth.ctx.clubId);
  return { items };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMeetingDate(date: Date, locale: string) {
  if (locale === "en") return date.toLocaleDateString("en-GB");
  if (locale === "es") return date.toLocaleDateString("es-ES");
  return date.toLocaleDateString("fr-FR");
}

async function buildMeetingInvitationEmail(params: {
  club: { id: string; name: string; logoUrl?: string | null };
  meeting: {
    id: string;
    title?: string | null;
    date: Date;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  };
  clubName: string;
  locale: string;
  agendaTitles?: string[];
}) {
  const { club, meeting, locale, agendaTitles = [] } = params;
  const ics = icsAttachment({
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    location: meeting.location,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    clubName: params.clubName,
  });
  const { getAppBaseUrl } = await import("@/lib/app-url");
  const baseUrl = getAppBaseUrl();
  const agendaHtml =
    agendaTitles.length > 0
      ? `<ol>${agendaTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join("")}</ol>`
      : "";
  const when = formatMeetingDate(meeting.date, locale);
  const timePart = meeting.startTime ? ` — ${meeting.startTime}` : "";
  const locationPart = meeting.location
    ? locale === "fr"
      ? `<p><strong>Lieu :</strong> ${escapeHtml(meeting.location)}</p>`
      : locale === "es"
        ? `<p><strong>Lugar:</strong> ${escapeHtml(meeting.location)}</p>`
        : `<p><strong>Location:</strong> ${escapeHtml(meeting.location)}</p>`
    : "";
  const body =
    locale === "fr"
      ? `<p>Vous êtes convoqué(e) à la réunion du <strong>${when}${timePart}</strong>.</p>${locationPart}${agendaHtml ? `<p><strong>Ordre du jour</strong></p>${agendaHtml}` : ""}`
      : locale === "es"
        ? `<p>Está convocado/a a la reunión del <strong>${when}${timePart}</strong>.</p>${locationPart}${agendaHtml ? `<p><strong>Orden del día</strong></p>${agendaHtml}` : ""}`
        : `<p>You are invited to the meeting on <strong>${when}${timePart}</strong>.</p>${locationPart}${agendaHtml ? `<p><strong>Agenda</strong></p>${agendaHtml}` : ""}`;

  const branded = await prepareBrandedEmail(body, {
    clubName: club.name,
    clubId: club.id,
    logoUrl: club.logoUrl,
    baseUrl,
  });

  const subject =
    locale === "fr"
      ? `Convocation — ${club.name}`
      : locale === "es"
        ? `Convocatoria — ${club.name}`
        : `Meeting invitation — ${club.name}`;

  return { ...branded, subject, ics };
}

export async function createMeeting(
  data: Record<string, string>,
  locale: string
) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  let meetingType = ((data.type as MeetingType) || "STATUTORY") as MeetingType;
  let commissionId: string | null = data.commissionId?.trim() || null;

  if (isCommissionChairRole(ctx)) {
    const chairScope = await assertCommissionChairHasCommission(ctx);
    if ("error" in chairScope) return { error: chairScope.error };
    meetingType = "COMMISSION";
    commissionId = chairScope.commissionId;
  } else if (meetingType === "COMMISSION" && !commissionId) {
    return { error: "COMMISSION_REQUIRED" as const };
  }

  const mode = data.mode === "now" ? "now" : "scheduled";
  const typeMetadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      ["commissionName", "partnerClubs", "governor", "adg", "officialGuests"].includes(key) &&
      value
    ) {
      typeMetadata[key] = value;
    }
  }

  const now = new Date();
  const liveEnabled = isFeatureEnabled(ctx.features, "liveMeetings", ctx.isSuperAdmin);
  const meetingDate =
    mode === "now"
      ? now
      : data.date
        ? parseLocalDate(data.date)
        : now;
  const startTime =
    mode === "now"
      ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      : data.startTime || ctx.club.meetingTime || undefined;

  // Live only when mode is "now" AND the feature is available
  const goLive = mode === "now" && liveEnabled;

  const meeting = await prisma.meeting.create({
    data: {
      clubId: ctx.clubId,
      date: meetingDate,
      location: data.location || ctx.club.meetingLocation,
      startTime,
      endTime: mode === "now" ? undefined : data.endTime || undefined,
      presidedBy: data.presidedBy || ctx.club.presidentName,
      secretary: data.secretary || ctx.club.secretaryName,
      type: meetingType,
      commissionId,
      typeMetadata: Object.keys(typeMetadata).length ? typeMetadata : undefined,
      isLive: goLive,
    },
  });
  const formAgenda = parseAgendaFromForm(data);
  const templateItems =
    formAgenda ?? (await getAgendaTemplateForMeeting(meetingType, locale, ctx.clubId));

  await prisma.minute.create({
    data: {
      clubId: ctx.clubId,
      meetingId: meeting.id,
      title: `PV — ${formatMeetingDate(meetingDate, locale)}`,
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

  revalidateMeetingPaths(locale, meeting.id);

  if (mode === "now") {
    // Live feature on → live room; otherwise attendance + CTA to start PV notes
    if (goLive) {
      redirect(`/${locale}/meetings/${meeting.id}/live`);
    }
    redirect(`/${locale}/meetings/${meeting.id}/attendance`);
  }

  // Scheduled: list view with invitation banner (not attendance)
  redirect(`/${locale}/meetings?scheduled=${meeting.id}`);
}

/** Mark a scheduled meeting as live and open the live room. */
export async function startLiveMeeting(meetingId: string, locale: string) {
  const auth = await requirePermission("meetings.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  if (!isFeatureEnabled(ctx.features, "liveMeetings", ctx.isSuperAdmin)) {
    return { error: "FEATURE_DISABLED" as const };
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, clubId: ctx.clubId },
  });
  if (!meeting) return { error: "NOT_FOUND" as const };

  const access = await assertCommissionMeetingAccess(ctx, meeting);
  if ("error" in access) return { error: access.error };

  if (!meeting.isLive) {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { isLive: true },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEETING_LIVE_STARTED",
      entity: "Meeting",
      entityId: meetingId,
    },
  });

  revalidateMeetingPaths(locale, meetingId);
  redirect(`/${locale}/meetings/${meetingId}/live`);
}

/** End a live meeting: clear isLive, set endTime, go to PV or attendance. */
export async function endLiveMeeting(meetingId: string, locale: string) {
  const auth = await requirePermission("meetings.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, clubId: ctx.clubId },
    include: { minute: { select: { id: true } } },
  });
  if (!meeting) return { error: "NOT_FOUND" as const };

  const access = await assertCommissionMeetingAccess(ctx, meeting);
  if ("error" in access) return { error: access.error };

  const now = new Date();
  const endTime =
    meeting.endTime ||
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      isLive: false,
      endTime,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEETING_LIVE_ENDED",
      entity: "Meeting",
      entityId: meetingId,
      metadata: { endTime },
    },
  });

  revalidateMeetingPaths(locale, meetingId);

  if (meeting.minute?.id) {
    redirect(`/${locale}/minutes/${meeting.minute.id}/edit?ended=1`);
  }
  redirect(`/${locale}/meetings/${meetingId}/attendance?ended=1`);
}

/** Send meeting invitation (convocation) to club members with an email. */
export async function sendMeetingInvitation(meetingId: string, locale: string) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, clubId: ctx.clubId },
    include: {
      minute: {
        include: {
          agendaItems: { orderBy: { sortOrder: "asc" }, select: { title: true } },
        },
      },
    },
  });
  if (!meeting) return { error: "NOT_FOUND" as const };

  const access = await assertCommissionMeetingAccess(ctx, meeting);
  if ("error" in access) return { error: access.error };

  const members = await prisma.member.findMany({
    where: { clubId: ctx.clubId, isActive: true, email: { not: null } },
    select: { email: true },
  });
  const recipients = [
    ...new Set(
      members
        .map((m) => m.email?.trim().toLowerCase())
        .filter((e): e is string => !!e && e.includes("@"))
    ),
  ];
  if (ctx.club.email?.includes("@")) {
    const clubEmail = ctx.club.email.trim().toLowerCase();
    if (!recipients.includes(clubEmail)) recipients.push(clubEmail);
  }

  if (recipients.length === 0) {
    return { error: "NO_RECIPIENTS" as const };
  }

  const email = await buildMeetingInvitationEmail({
    club: ctx.club,
    meeting,
    clubName: ctx.club.name,
    locale,
    agendaTitles: meeting.minute?.agendaItems.map((i) => i.title) ?? [],
  });

  let sent = 0;
  let failed = 0;
  const historyRecipients: Array<{
    email: string;
    status: "sent" | "failed";
    error?: string | null;
  }> = [];
  for (const to of recipients) {
    const result = await sendClubEmail(ctx.clubId, {
      to,
      subject: email.subject,
      html: email.html,
      attachments: [...(email.attachments ?? []), email.ics],
    });
    if (result.ok) sent++;
    else failed++;
    historyRecipients.push({
      email: to,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
    });
  }

  const { recordEmailCampaign } = await import("@/lib/email-history");
  const meetingLabel = formatMeetingDate(meeting.date, locale);
  await recordEmailCampaign({
    clubId: ctx.clubId,
    name:
      locale === "fr"
        ? `Convocation — ${meetingLabel}`
        : locale === "es"
          ? `Convocatoria — ${meetingLabel}`
          : `Meeting invitation — ${meetingLabel}`,
    subject: email.subject,
    body: email.html,
    recipients: historyRecipients,
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEETING_INVITATION_SENT",
      entity: "Meeting",
      entityId: meeting.id,
      metadata: { sent, failed, recipients: recipients.length },
    },
  });

  revalidateMeetingPaths(locale, meetingId);
  return { success: true as const, sent, failed, recipients: recipients.length };
}

export async function getLastMeetingDefaults(clubId: string) {
  const last = await prisma.meeting.findFirst({
    where: { clubId },
    orderBy: { date: "desc" },
  });
  return last;
}