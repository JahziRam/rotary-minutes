"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import { canViewDistrictMinutes } from "@/lib/district-access";
import { generateMinuteHash, getVerifyUrl, resolveMinuteVerifyUrl } from "@/lib/hash";
import { getAppBaseUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/require-permission";
import { minuteFinalizedEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import {
  attendanceWithMemberInclude,
  buildMinutePdfBuffer,
  minutePdfInclude,
} from "@/lib/pdf/build-minute-pdf";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import type { MinuteStatus, Prisma } from "@/generated/prisma/client";

function revalidateMinutePaths(minuteId: string, locale?: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/minutes`);
    revalidatePath(`/${loc}/minutes/${minuteId}`);
    revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/meetings`);
    revalidatePath(`/${loc}/statistics`);
  }
  if (locale) revalidatePath(`/${locale}/minutes/${minuteId}`);
}

export async function saveMinute(
  minuteId: string,
  data: {
    agendaItems: Array<{
      id?: string;
      title: string;
      description: string;
      decisions: string;
      actions: string;
      responsible: string;
      dueDate: string;
      status: string;
    }>;
  }
) {
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { agendaItems: true, versions: true },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (["FINALIZED", "ARCHIVED", "REVIEW"].includes(minute.status)) {
    return { error: "LOCKED" };
  }

  const currentSnapshot = await prisma.minute.findUnique({
    where: { id: minuteId },
    include: {
      agendaItems: true,
      meeting: { include: { attendances: attendanceWithMemberInclude } },
    },
  });

  if (currentSnapshot) {
    const version = minute.versions.length + 1;
    const hash = generateMinuteHash({
      id: minuteId,
      title: currentSnapshot.title,
      agendaItems: currentSnapshot.agendaItems,
      meeting: currentSnapshot.meeting,
      attendances: [],
    });
    await prisma.minuteVersion.create({
      data: {
        minuteId,
        version,
        snapshot: currentSnapshot as object,
        contentHash: hash,
        authorId: ctx.userId,
      },
    });
  }

  await prisma.agendaItem.deleteMany({ where: { minuteId } });
  await prisma.agendaItem.createMany({
    data: data.agendaItems.map((item, i) => ({
      minuteId,
      sortOrder: i,
      title: item.title,
      description: item.description || null,
      decisions: item.decisions || null,
      actions: item.actions || null,
      responsible: item.responsible || null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      status: item.status as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "DEFERRED" | "CANCELLED",
    })),
  });

  revalidateMinutePaths(minuteId);
  return { success: true };
}

export async function applyAgendaTemplate(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { meeting: true, agendaItems: true },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (["FINALIZED", "ARCHIVED", "REVIEW"].includes(minute.status)) {
    return { error: "LOCKED" };
  }

  const templateItems = await getAgendaTemplateForMeeting(
    minute.meeting.type,
    locale,
    ctx.clubId
  );

  await prisma.agendaItem.deleteMany({ where: { minuteId } });
  await prisma.agendaItem.createMany({
    data: templateItems.map((item, i) => ({
      minuteId,
      sortOrder: i,
      title: item.title,
      description: item.description ?? null,
      status: (item.status ?? "OPEN") as "OPEN",
    })),
  });

  revalidateMinutePaths(minuteId, locale);
  return { success: true, items: templateItems };
}

async function doFinalizeMinute(
  minuteId: string,
  ctx: { clubId: string; userId: string },
  locale: string,
  approvedById?: string
) {
  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: {
      club: true,
      agendaItems: true,
      meeting: { include: { attendances: attendanceWithMemberInclude } },
    },
  });
  if (!minute) return { error: "NOT_FOUND" as const };

  const hash = generateMinuteHash({
    id: minute.id,
    title: minute.title,
    agendaItems: minute.agendaItems,
    meeting: minute.meeting,
    attendances: minute.meeting.attendances,
  });

  const baseUrl = getAppBaseUrl();
  const verifyUrl = getVerifyUrl(hash, baseUrl, locale);
  const now = new Date();

  await prisma.minute.update({
    where: { id: minuteId },
    data: {
      status: "FINALIZED",
      contentHash: hash,
      verifyUrl,
      finalizedAt: now,
      approvedAt: approvedById ? now : undefined,
      approvedById: approvedById ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_FINALIZED",
      entity: "Minute",
      entityId: minuteId,
      metadata: { hash },
    },
  });

  const { syncFromMinuteWorkflow } = await import("@/actions/governance");
  void syncFromMinuteWorkflow(minuteId, "finalize", ctx.userId);

  const clubEmail = minute.club.email;
  if (clubEmail) {
    const mail = await minuteFinalizedEmail({
      clubName: minute.club.name,
      clubId: minute.club.id,
      minuteTitle: minute.title,
      verifyUrl,
      locale,
      logoUrl: minute.club.logoUrl ?? undefined,
    });
    const { buffer, filename } = await buildMinutePdfBuffer(minute, locale);
    await sendClubEmail(minute.club.id, {
      to: clubEmail,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        ...(mail.attachments ?? []),
        { filename, content: buffer },
      ],
    });
  }

  const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
  void dispatchClubWebhook(ctx.clubId, "MINUTE_FINALIZED", {
    minuteId,
    title: minute.title,
    status: "FINALIZED",
    contentHash: hash,
    verifyUrl,
    finalizedAt: now.toISOString(),
    meetingId: minute.meetingId,
  });

  const { linkMinuteAsDocument } = await import("@/actions/documents");
  void linkMinuteAsDocument(minuteId, ctx.clubId, ctx.userId, minute.title);

  const { syncFromAgendaItems } = await import("@/actions/club-actions");
  void syncFromAgendaItems(minuteId, ctx.clubId);

  revalidateMinutePaths(minuteId, locale);
  return { success: true as const, hash, verifyUrl };
}

export async function submitMinuteForReview(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.submit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (!["DRAFT", "IN_PROGRESS"].includes(minute.status)) {
    return { error: "INVALID_STATUS" };
  }

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { presidentApprovalRequired: true },
  });

  if (club && !club.presidentApprovalRequired) {
    return doFinalizeMinute(minuteId, ctx, locale, ctx.userId);
  }

  await prisma.minute.update({
    where: { id: minuteId },
    data: {
      status: "REVIEW",
      submittedAt: new Date(),
      submittedById: ctx.userId,
      reviewComment: null,
    },
  });

  const presidents = await prisma.clubMembership.findMany({
    where: { clubId: ctx.clubId, role: "PRESIDENT", isActive: true },
    select: { userId: true },
  });
  if (presidents.length) {
    await prisma.notification.createMany({
      data: presidents.map((p) => ({
        userId: p.userId,
        clubId: ctx.clubId,
        type: "NEW_MINUTE" as const,
        title: locale === "fr" ? "PV à approuver" : "Minutes awaiting approval",
        message: minute.title,
        link: `/${locale}/minutes/${minuteId}`,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_SUBMITTED_REVIEW",
      entity: "Minute",
      entityId: minuteId,
    },
  });

  const { syncFromMinuteWorkflow } = await import("@/actions/governance");
  void syncFromMinuteWorkflow(minuteId, "submit", ctx.userId);

  revalidateMinutePaths(minuteId, locale);
  return { success: true };
}

export async function approveMinute(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.approve");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (minute.status !== "REVIEW") return { error: "INVALID_STATUS" };

  const { syncFromMinuteWorkflow } = await import("@/actions/governance");
  void syncFromMinuteWorkflow(minuteId, "approve", ctx.userId);

  return doFinalizeMinute(minuteId, ctx, locale, ctx.userId);
}

export async function rejectMinute(minuteId: string, comment: string, locale: string) {
  const auth = await requirePermission("minutes.approve");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (minute.status !== "REVIEW") return { error: "INVALID_STATUS" };

  await prisma.minute.update({
    where: { id: minuteId },
    data: {
      status: "IN_PROGRESS",
      reviewComment: comment || "Révision demandée",
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_REJECTED",
      entity: "Minute",
      entityId: minuteId,
      metadata: { comment },
    },
  });

  const secretaries = await prisma.clubMembership.findMany({
    where: { clubId: ctx.clubId, role: { in: ["SECRETARY", "PROTOCOL"] }, isActive: true },
    select: { userId: true },
  });
  if (secretaries.length) {
    await prisma.notification.createMany({
      data: secretaries.map((s) => ({
        userId: s.userId,
        clubId: ctx.clubId,
        type: "SYSTEM" as const,
        title: locale === "fr" ? "Corrections demandées sur le PV" : "Minutes corrections requested",
        message: comment || (locale === "fr" ? "Le président a demandé des modifications." : "President requested changes."),
        link: `/${locale}/minutes/${minuteId}/edit`,
      })),
      skipDuplicates: true,
    });
  }

  revalidateMinutePaths(minuteId, locale);
  return { success: true };
}

/** @deprecated Préférer submitMinuteForReview + approveMinute */
export async function finalizeMinute(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.finalize");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
  });
  if (!minute) return { error: "NOT_FOUND" };

  if (minute.status === "REVIEW") {
    return approveMinute(minuteId, locale);
  }
  if (!["DRAFT", "IN_PROGRESS"].includes(minute.status)) {
    return { error: "INVALID_STATUS" };
  }

  return doFinalizeMinute(minuteId, ctx, locale);
}

export async function searchMinutes(filters: {
  q?: string;
  status?: MinuteStatus;
  meetingType?: string;
  year?: number;
  includeArchived?: boolean;
}) {
  const ctx = await getClubContext();
  if (!ctx) return [];

  const where: Prisma.MinuteWhereInput = {
    clubId: ctx.clubId,
  };

  if (filters.status) {
    where.status = filters.status;
  } else if (!filters.includeArchived) {
    where.status = { not: "ARCHIVED" };
  }

  if (filters.q?.trim()) {
    where.OR = [
      { title: { contains: filters.q.trim(), mode: "insensitive" } },
      { author: { firstName: { contains: filters.q.trim(), mode: "insensitive" } } },
      { author: { lastName: { contains: filters.q.trim(), mode: "insensitive" } } },
    ];
  }

  if (filters.meetingType) {
    where.meeting = { type: filters.meetingType as never };
  }

  if (filters.year) {
    where.meeting = {
      ...(where.meeting as object),
      date: {
        gte: new Date(`${filters.year}-01-01`),
        lt: new Date(`${filters.year + 1}-01-01`),
      },
    };
  }

  const rows = await prisma.minute.findMany({
    where,
    include: {
      meeting: { select: { date: true, type: true } },
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return rows.map((pv) => ({
    id: pv.id,
    title: pv.title,
    status: pv.status,
    meetingDate: pv.meeting.date.toISOString(),
    meetingType: pv.meeting.type,
    authorName: pv.author ? `${pv.author.firstName} ${pv.author.lastName}` : undefined,
  }));
}

export async function duplicateMinute(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const source = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { agendaItems: true, meeting: true },
  });
  if (!source) return { error: "NOT_FOUND" };

  const newDate = new Date();
  newDate.setDate(newDate.getDate() + 7);

  const meeting = await prisma.meeting.create({
    data: {
      clubId: ctx.clubId,
      date: newDate,
      location: source.meeting.location,
      startTime: source.meeting.startTime,
      endTime: source.meeting.endTime,
      presidedBy: source.meeting.presidedBy,
      secretary: source.meeting.secretary,
      type: source.meeting.type,
      typeMetadata: source.meeting.typeMetadata ?? undefined,
    },
  });

  const newMinute = await prisma.minute.create({
    data: {
      clubId: ctx.clubId,
      meetingId: meeting.id,
      title: `${source.title} (copie)`,
      status: "DRAFT",
      authorId: ctx.userId,
      agendaItems: {
        create: source.agendaItems.map((item, i) => ({
          sortOrder: i,
          title: item.title,
          description: item.description,
          decisions: item.decisions,
          actions: item.actions,
          responsible: item.responsible,
          dueDate: item.dueDate,
          status: "OPEN",
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_DUPLICATED",
      entity: "Minute",
      entityId: newMinute.id,
      metadata: { sourceId: minuteId },
    },
  });

  revalidatePath(`/${locale}/minutes`);
  redirect(`/${locale}/minutes/${newMinute.id}/edit`);
}

export async function archiveMinute(minuteId: string, locale: string) {
  const auth = await requirePermission("minutes.delete");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
  });
  if (!minute) return { error: "NOT_FOUND" };

  await prisma.minute.update({
    where: { id: minuteId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_ARCHIVED",
      entity: "Minute",
      entityId: minuteId,
    },
  });

  revalidateMinutePaths(minuteId, locale);
  return { success: true };
}

export async function getMinuteMemberEmailCount(minuteId: string) {
  const ctx = await getClubContext();
  if (!ctx) return 0;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!minute) return 0;

  const members = await prisma.member.findMany({
    where: {
      clubId: ctx.clubId,
      isActive: true,
      email: { not: null },
    },
    select: { email: true },
  });

  return new Set(
    members
      .map((m) => m.email?.trim().toLowerCase())
      .filter((e): e is string => !!e && e.includes("@"))
  ).size;
}

async function dispatchMinuteEmail(
  minute: {
    id: string;
    title: string;
    contentHash: string | null;
    verifyUrl: string | null;
    club: { id: string; name: string; logoUrl: string | null };
  },
  recipientEmail: string,
  locale: string,
  pdf: { buffer: Buffer; filename: string },
  verifyUrl: string
) {
  const mail = await minuteFinalizedEmail({
    clubName: minute.club.name,
    clubId: minute.club.id,
    minuteTitle: minute.title,
    verifyUrl,
    locale,
    logoUrl: minute.club.logoUrl ?? undefined,
  });
  return sendClubEmail(minute.club.id, {
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
    attachments: [
      ...(mail.attachments ?? []),
      { filename: pdf.filename, content: pdf.buffer },
    ],
  });
}

export async function sendMinuteByEmail(
  minuteId: string,
  recipientEmail: string,
  locale: string
) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" };

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: minutePdfInclude,
  });
  if (!minute) return { error: "NOT_FOUND" };

  if (!recipientEmail?.includes("@")) {
    return { error: "INVALID_EMAIL" };
  }

  if (minute.status !== "FINALIZED" || !minute.contentHash) {
    return { error: "NOT_FINALIZED" };
  }

  const verifyUrl = resolveMinuteVerifyUrl(minute, locale);
  if (!verifyUrl) return { error: "NOT_FINALIZED" };

  const pdf = await buildMinutePdfBuffer(minute, locale);
  const sent = await dispatchMinuteEmail(
    minute,
    recipientEmail,
    locale,
    pdf,
    verifyUrl
  );

  await prisma.notification.create({
    data: {
      userId: ctx.userId,
      clubId: ctx.clubId,
      type: "NEW_MINUTE",
      title: "PV envoyé par email",
      message: `${minute.title} → ${recipientEmail}`,
      link: `/${locale}/minutes/${minuteId}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_EMAILED",
      entity: "Minute",
      entityId: minuteId,
      metadata: { recipient: recipientEmail, pdfAttached: true },
    },
  });

  return {
    success: true,
    message: sent.ok
      ? `PV envoyé à ${recipientEmail}`
      : `Notification enregistrée (email désactivé) — ${recipientEmail}`,
  };
}

export async function sendMinuteToAllMembers(minuteId: string, locale: string) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" };

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: minutePdfInclude,
  });
  if (!minute) return { error: "NOT_FOUND" };

  if (minute.status !== "FINALIZED" || !minute.contentHash) {
    return { error: "NOT_FINALIZED" };
  }

  const verifyUrl = resolveMinuteVerifyUrl(minute, locale);
  if (!verifyUrl) return { error: "NOT_FINALIZED" };

  const members = await prisma.member.findMany({
    where: {
      clubId: ctx.clubId,
      isActive: true,
      email: { not: null },
    },
    select: { email: true },
  });

  const emails = [
    ...new Set(
      members
        .map((m) => m.email?.trim())
        .filter((e): e is string => !!e && e.includes("@"))
    ),
  ];

  if (emails.length === 0) {
    return { error: "NO_MEMBER_EMAILS" };
  }

  const pdf = await buildMinutePdfBuffer(minute, locale);
  let sentCount = 0;

  for (const email of emails) {
    const result = await dispatchMinuteEmail(
      minute,
      email,
      locale,
      pdf,
      verifyUrl
    );
    if (result.ok) sentCount++;
  }

  await prisma.notification.create({
    data: {
      userId: ctx.userId,
      clubId: ctx.clubId,
      type: "NEW_MINUTE",
      title: "PV envoyé aux membres",
      message: `${minute.title} → ${sentCount}/${emails.length} membre(s)`,
      link: `/${locale}/minutes/${minuteId}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_EMAILED",
      entity: "Minute",
      entityId: minuteId,
      metadata: {
        bulk: true,
        recipients: emails.length,
        sent: sentCount,
        pdfAttached: true,
      },
    },
  });

  return {
    success: true,
    sent: sentCount,
    total: emails.length,
    message:
      sentCount > 0
        ? `PV envoyé à ${sentCount} membre(s) sur ${emails.length}`
        : `Aucun email envoyé (${emails.length} destinataire(s), Resend désactivé)`,
  };
}

const minuteDetailInclude = {
  club: true,
  agendaItems: { orderBy: { sortOrder: "asc" as const } },
  meeting: { include: { attendances: attendanceWithMemberInclude } },
  author: { select: { firstName: true, lastName: true } },
  versions: {
    orderBy: { version: "desc" as const },
    take: 5,
    include: { author: { select: { firstName: true, lastName: true } } },
  },
};

export async function getMinuteById(minuteId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const ctx = await getClubContext();
  if (ctx) {
    const ownClubMinute = await prisma.minute.findFirst({
      where: { id: minuteId, clubId: ctx.clubId },
      include: minuteDetailInclude,
    });
    if (ownClubMinute) return ownClubMinute;
  }

  const minute = await prisma.minute.findUnique({
    where: { id: minuteId },
    include: minuteDetailInclude,
  });
  if (!minute || minute.status !== "FINALIZED" || !minute.club.district) {
    return null;
  }

  const canView = await canViewDistrictMinutes(session.user.id, minute.club.district);
  if (!canView && !session.user.isSuperAdmin) return null;

  return minute;
}