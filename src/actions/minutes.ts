"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import { canViewDistrictMinutes } from "@/lib/district-access";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { getAppBaseUrl } from "@/lib/app-url";
import { requirePermission } from "@/lib/require-permission";
import { minuteFinalizedEmail, minuteReviewRequestEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import {
  attendanceWithMemberInclude,
  buildMinutePdfBuffer,
  minutePdfInclude,
} from "@/lib/pdf/build-minute-pdf";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import {
  applyMinuteScopeToWhere,
  assertMinuteAccess,
  loadMinuteForContext,
} from "@/lib/commission-scope";
import { assertMinuteEditable } from "@/lib/minute-lock";
import { parseLocalDate } from "@/lib/local-date";
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
    title?: string;
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
    meeting?: {
      date?: string;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      presidedBy?: string | null;
      secretary?: string | null;
    };
  },
  /** quiet: background autosave — skip version snapshot + path revalidation flood. */
  options?: { quiet?: boolean }
) {
  const quiet = !!options?.quiet;
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await loadMinuteForContext(ctx, minuteId);
  if (!minute) return { error: "NOT_FOUND" };
  const access = await assertMinuteAccess(ctx, minute);
  if ("error" in access) return { error: access.error };

  const minuteFull = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { agendaItems: true, versions: true, meeting: true },
  });
  if (!minuteFull) return { error: "NOT_FOUND" };
  const lock = assertMinuteEditable(minuteFull.status, ctx);
  if (lock) return lock;

  // Manual saves keep a version history; quiet autosaves only persist content.
  if (!quiet) {
    const currentSnapshot = await prisma.minute.findUnique({
      where: { id: minuteId },
      include: {
        agendaItems: true,
        meeting: { include: { attendances: attendanceWithMemberInclude } },
      },
    });

    if (currentSnapshot) {
      const version = minuteFull.versions.length + 1;
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
  }

  // Meeting header (date, location, officers, times)
  if (data.meeting) {
    const m = data.meeting;
    const meetingUpdate: {
      date?: Date;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      presidedBy?: string | null;
      secretary?: string | null;
    } = {};
    if (m.date !== undefined && m.date.trim()) {
      meetingUpdate.date = parseLocalDate(m.date);
    }
    if (m.location !== undefined) {
      meetingUpdate.location = m.location?.trim() || null;
    }
    if (m.startTime !== undefined) {
      meetingUpdate.startTime = m.startTime?.trim() || null;
    }
    if (m.endTime !== undefined) {
      meetingUpdate.endTime = m.endTime?.trim() || null;
    }
    if (m.presidedBy !== undefined) {
      meetingUpdate.presidedBy = m.presidedBy?.trim() || null;
    }
    if (m.secretary !== undefined) {
      meetingUpdate.secretary = m.secretary?.trim() || null;
    }
    if (Object.keys(meetingUpdate).length > 0) {
      await prisma.meeting.update({
        where: { id: minuteFull.meetingId },
        data: meetingUpdate,
      });
    }
  }

  // Minute title
  const nextTitle =
    data.title !== undefined ? data.title.trim() || minuteFull.title : undefined;
  if (nextTitle !== undefined && nextTitle !== minuteFull.title) {
    await prisma.minute.update({
      where: { id: minuteId },
      data: { title: nextTitle },
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

  const savedAgendaItems = await prisma.agendaItem.findMany({
    where: { minuteId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  if (minuteFull.status === "DRAFT") {
    await prisma.minute.update({
      where: { id: minuteId },
      data: { status: "IN_PROGRESS" },
    });
  }

  // Keep integrity seal in sync when correcting an already-finalized PV.
  if (minuteFull.status === "FINALIZED") {
    const refreshed = await prisma.minute.findFirst({
      where: { id: minuteId, clubId: ctx.clubId },
      include: {
        agendaItems: true,
        meeting: { include: { attendances: attendanceWithMemberInclude } },
      },
    });
    if (refreshed) {
      const newHash = generateMinuteHash({
        id: refreshed.id,
        title: refreshed.title,
        agendaItems: refreshed.agendaItems,
        meeting: refreshed.meeting,
        attendances: refreshed.meeting.attendances,
      });
      const baseUrl = getAppBaseUrl();
      const verifyUrl = getVerifyUrl(newHash, baseUrl, "fr");
      await prisma.minute.update({
        where: { id: minuteId },
        data: { contentHash: newHash, verifyUrl },
      });
      await prisma.auditLog.create({
        data: {
          clubId: ctx.clubId,
          userId: ctx.userId,
          action: "MINUTE_OVERRIDE_EDIT",
          entity: "Minute",
          entityId: minuteId,
          metadata: {
            previousStatus: minuteFull.status,
            newHash,
            role: ctx.role,
            isSuperAdmin: ctx.isSuperAdmin,
            updatedMeeting: !!data.meeting,
            updatedTitle: nextTitle !== undefined,
          },
        },
      });
    }
  } else if (minuteFull.status === "ARCHIVED" || minuteFull.status === "REVIEW") {
    await prisma.auditLog.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        action: "MINUTE_OVERRIDE_EDIT",
        entity: "Minute",
        entityId: minuteId,
        metadata: {
          previousStatus: minuteFull.status,
          role: ctx.role,
          isSuperAdmin: ctx.isSuperAdmin,
          updatedMeeting: !!data.meeting,
          updatedTitle: nextTitle !== undefined,
        },
      },
    });
  }

  if (!quiet) {
    revalidateMinutePaths(minuteId);
    for (const loc of ["fr", "en", "es"]) {
      revalidatePath(`/${loc}/meetings`);
      revalidatePath(`/${loc}/meetings/${minuteFull.meetingId}/attendance`);
    }
  } else {
    // Light revalidation so the edit page stays coherent without full cache flush.
    for (const loc of ["fr", "en", "es"]) {
      revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
    }
  }
  return {
    success: true as const,
    agendaItems: savedAgendaItems.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
    })),
  };
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
  const access = await assertMinuteAccess(ctx, minute);
  if ("error" in access) return { error: access.error };
  const lock = assertMinuteEditable(minute.status, ctx);
  if (lock) return lock;

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
    const loginUrl = `${baseUrl.replace(/\/$/, "")}/${locale}/login`;
    const mail = await minuteFinalizedEmail({
      clubName: minute.club.name,
      clubId: minute.club.id,
      minuteTitle: minute.title,
      loginUrl,
      locale,
      logoUrl: minute.club.logoUrl ?? undefined,
    });
    const { buffer, filename } = await buildMinutePdfBuffer(minute, locale);
    const { loadMinuteAttachmentBuffers } = await import("@/actions/minute-attachments");
    const extraAttachments = await loadMinuteAttachmentBuffers(minuteId, minute.club.id);
    const sent = await sendClubEmail(minute.club.id, {
      to: clubEmail,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        ...(mail.attachments ?? []),
        { filename, content: buffer },
        ...extraAttachments,
      ],
    });
    const { recordEmailCampaign, emailStatusFromSendResult } = await import(
      "@/lib/email-history"
    );
    await recordEmailCampaign({
      clubId: minute.club.id,
      name:
        locale === "fr"
          ? `PV finalisé — ${minute.title}`
          : locale === "es"
            ? `Acta finalizada — ${minute.title}`
            : `Minutes finalized — ${minute.title}`,
      subject: mail.subject,
      body: mail.html,
      recipients: [
        {
          email: clubEmail,
          status: emailStatusFromSendResult(sent.ok),
          error: sent.error ?? null,
        },
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
    include: {
      club: { select: { id: true, name: true, logoUrl: true, presidentApprovalRequired: true } },
      author: { select: { firstName: true, lastName: true } },
    },
  });
  if (!minute) return { error: "NOT_FOUND" };
  if (!["DRAFT", "IN_PROGRESS"].includes(minute.status)) {
    return { error: "INVALID_STATUS" };
  }

  if (!minute.club.presidentApprovalRequired) {
    const fin = await doFinalizeMinute(minuteId, ctx, locale, ctx.userId);
    if ("error" in fin && fin.error) return fin;
    return { success: true as const, finalized: true as const };
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
    where: {
      clubId: ctx.clubId,
      role: { in: ["PRESIDENT", "VICE_PRESIDENT"] },
      isActive: true,
    },
    select: {
      userId: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  const baseUrl = getAppBaseUrl();
  const reviewUrl = `${baseUrl.replace(/\/$/, "")}/${locale}/minutes/${minuteId}`;
  const submittedByName = minute.author
    ? `${minute.author.firstName} ${minute.author.lastName}`.trim()
    : undefined;

  if (presidents.length) {
    await prisma.notification.createMany({
      data: presidents.map((p) => ({
        userId: p.userId,
        clubId: ctx.clubId,
        type: "NEW_MINUTE" as const,
        title:
          locale === "fr"
            ? "PV à valider"
            : locale === "es"
              ? "Acta por validar"
              : "Minutes awaiting approval",
        message: minute.title,
        link: `/${locale}/minutes/${minuteId}`,
      })),
      skipDuplicates: true,
    });

    const mail = await minuteReviewRequestEmail({
      clubName: minute.club.name,
      clubId: minute.club.id,
      minuteTitle: minute.title,
      reviewUrl,
      locale,
      logoUrl: minute.club.logoUrl ?? undefined,
      submittedByName,
    });
    const historyRecipients: Array<{
      email: string;
      status: "sent" | "failed" | "simulated";
      error?: string | null;
    }> = [];
    for (const p of presidents) {
      const email = p.user.email?.trim();
      if (!email?.includes("@")) continue;
      const result = await sendClubEmail(ctx.clubId, {
        to: email,
        subject: mail.subject,
        html: mail.html,
        attachments: mail.attachments,
      });
      historyRecipients.push({
        email,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? null,
      });
    }
    if (historyRecipients.length > 0) {
      const { recordEmailCampaign } = await import("@/lib/email-history");
      await recordEmailCampaign({
        clubId: ctx.clubId,
        name:
          locale === "fr"
            ? `PV à valider — ${minute.title}`
            : locale === "es"
              ? `Acta por validar — ${minute.title}`
              : `Minutes to validate — ${minute.title}`,
        subject: mail.subject,
        body: mail.html,
        recipients: historyRecipients,
      });
    }
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
  return { success: true as const, finalized: false as const, emailedPresidents: presidents.length };
}

/**
 * Finalize the PV (if needed) then email the official PDF to all active members.
 */
export async function finalizeAndSendToMembers(minuteId: string, locale: string) {
  const finalizeAuth = await requirePermission("minutes.finalize");
  const submitAuth = finalizeAuth.error
    ? await requirePermission("minutes.submit")
    : finalizeAuth;
  if (submitAuth.error) return { error: submitAuth.error };
  const { ctx } = submitAuth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    select: { id: true, status: true },
  });
  if (!minute) return { error: "NOT_FOUND" as const };

  if (["DRAFT", "IN_PROGRESS"].includes(minute.status)) {
    const fin = await doFinalizeMinute(minuteId, ctx, locale, ctx.userId);
    if ("error" in fin && fin.error) return fin;
  } else if (minute.status === "REVIEW") {
    const approveAuth = await requirePermission("minutes.approve");
    if (approveAuth.error) return { error: "NEEDS_APPROVAL" as const };
    const fin = await doFinalizeMinute(minuteId, ctx, locale, ctx.userId);
    if ("error" in fin && fin.error) return fin;
  } else if (minute.status !== "FINALIZED") {
    return { error: "INVALID_STATUS" as const };
  }

  return sendMinuteToAllMembers(minuteId, locale);
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
  page?: number;
  pageSize?: number;
}) {
  const ctx = await getClubContext();
  if (!ctx) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: filters.pageSize ?? 12,
      totalPages: 1,
      start: 0,
      end: 0,
    };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  const where = await applyMinuteScopeToWhere(ctx, {
    clubId: ctx.clubId,
  });

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

  const [total, rows] = await Promise.all([
    prisma.minute.count({ where }),
    prisma.minute.findMany({
      where,
      include: {
        meeting: { select: { date: true, type: true } },
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const items = rows.map((pv) => ({
    id: pv.id,
    title: pv.title,
    status: pv.status,
    meetingDate: pv.meeting.date.toISOString(),
    meetingType: pv.meeting.type,
    authorName: pv.author ? `${pv.author.firstName} ${pv.author.lastName}` : undefined,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    start: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, total),
  };
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
  const access = await assertMinuteAccess(ctx, source);
  if ("error" in access) return { error: access.error };

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
      commissionId: source.meeting.commissionId,
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

  const minute = await loadMinuteForContext(ctx, minuteId);
  if (!minute) return { error: "NOT_FOUND" };
  const access = await assertMinuteAccess(ctx, minute);
  if ("error" in access) return { error: access.error };

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
  pdf: { buffer: Buffer; filename: string }
) {
  const { loadMinuteAttachmentBuffers } = await import("@/actions/minute-attachments");
  const extraAttachments = await loadMinuteAttachmentBuffers(minute.id, minute.club.id);
  const loginUrl = `${getAppBaseUrl().replace(/\/$/, "")}/${locale}/login`;

  const mail = await minuteFinalizedEmail({
    clubName: minute.club.name,
    clubId: minute.club.id,
    minuteTitle: minute.title,
    loginUrl,
    locale,
    logoUrl: minute.club.logoUrl ?? undefined,
  });
  const result = await sendClubEmail(minute.club.id, {
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
    attachments: [
      ...(mail.attachments ?? []),
      { filename: pdf.filename, content: pdf.buffer },
      ...extraAttachments,
    ],
  });
  return { result, subject: mail.subject, html: mail.html };
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

  const pdf = await buildMinutePdfBuffer(minute, locale);
  const { result: sent, subject, html } = await dispatchMinuteEmail(
    minute,
    recipientEmail,
    locale,
    pdf
  );

  const { recordEmailCampaign, emailStatusFromSendResult } = await import(
    "@/lib/email-history"
  );
  await recordEmailCampaign({
    clubId: ctx.clubId,
    name:
      locale === "fr"
        ? `PV — ${minute.title}`
        : locale === "es"
          ? `Acta — ${minute.title}`
          : `Minutes — ${minute.title}`,
    subject,
    body: html,
    recipients: [
      {
        email: recipientEmail,
        status: emailStatusFromSendResult(sent.ok),
        error: sent.error ?? null,
      },
    ],
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
  let subject = "";
  let html = "";
  const historyRecipients: Array<{
    email: string;
    status: "sent" | "failed" | "simulated";
    error?: string | null;
  }> = [];

  for (const email of emails) {
    const { result, subject: subj, html: body } = await dispatchMinuteEmail(
      minute,
      email,
      locale,
      pdf
    );
    subject = subj;
    html = body;
    if (result.ok) sentCount++;
    historyRecipients.push({
      email,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
    });
  }

  const { recordEmailCampaign } = await import("@/lib/email-history");
  await recordEmailCampaign({
    clubId: ctx.clubId,
    name:
      locale === "fr"
        ? `PV aux membres — ${minute.title}`
        : locale === "es"
          ? `Acta a miembros — ${minute.title}`
          : `Minutes to members — ${minute.title}`,
    subject: subject || minute.title,
    body: html || minute.title,
    recipients: historyRecipients,
  });

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
    const scopedWhere = await applyMinuteScopeToWhere(ctx, {
      id: minuteId,
      clubId: ctx.clubId,
    });
    const ownClubMinute = await prisma.minute.findFirst({
      where: scopedWhere,
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