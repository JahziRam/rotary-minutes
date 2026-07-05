"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import { canViewDistrictMinutes } from "@/lib/district-access";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { requirePermission } from "@/lib/require-permission";
import { sendEmail, minuteFinalizedEmail } from "@/lib/email";
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
      meeting: { include: { attendances: true } },
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
      meeting: { include: { attendances: true } },
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

  const clubEmail = minute.club.email;
  if (clubEmail) {
    const mail = minuteFinalizedEmail({
      clubName: minute.club.name,
      minuteTitle: minute.title,
      verifyUrl,
      locale,
    });
    await sendEmail({ to: clubEmail, subject: mail.subject, html: mail.html });
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

  await prisma.minute.update({
    where: { id: minuteId },
    data: {
      status: "REVIEW",
      submittedAt: new Date(),
      submittedById: ctx.userId,
      reviewComment: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_SUBMITTED_REVIEW",
      entity: "Minute",
      entityId: minuteId,
    },
  });

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

export async function sendMinuteByEmail(
  minuteId: string,
  recipientEmail: string,
  locale: string
) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" };

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { club: true },
  });
  if (!minute) return { error: "NOT_FOUND" };

  if (!recipientEmail?.includes("@")) {
    return { error: "INVALID_EMAIL" };
  }

  if (!minute.verifyUrl) return { error: "NOT_FINALIZED" };

  const mail = minuteFinalizedEmail({
    clubName: minute.club.name,
    minuteTitle: minute.title,
    verifyUrl: minute.verifyUrl,
    locale,
  });
  const sent = await sendEmail({
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
  });

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
      metadata: { recipient: recipientEmail },
    },
  });

  return {
    success: true,
    message: sent.ok
      ? `PV envoyé à ${recipientEmail}`
      : `Notification enregistrée (email désactivé) — ${recipientEmail}`,
  };
}

const minuteDetailInclude = {
  club: true,
  agendaItems: { orderBy: { sortOrder: "asc" as const } },
  meeting: { include: { attendances: true } },
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