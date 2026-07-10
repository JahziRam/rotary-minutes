"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requireFeature } from "@/lib/require-feature";
import { currentFiscalYear } from "@/lib/dues";
import { createMemberDuesCheckoutSession } from "@/lib/dues-stripe-checkout";
import { isClubDuesStripeEnabled } from "@/lib/club-stripe";
import { documentDownloadUrl, documentViewUrl } from "@/lib/document-urls";
import {
  ROTARY_ATTENDANCE_GOAL,
  computeRecordedAttendanceRate,
  getRotaryMandateYear,
  calculateAttendanceRate,
} from "@/lib/rotary";

const MANDATE_PRESENT_CATEGORIES = new Set([
  "PRESENT",
  "TRAVEL_RETURN",
  "EXTERNAL_ATTENDANCE",
  "TRAVELING",
]);

function computeMandateAttendance(
  meetings: Array<{ attendances: Array<{ category: string }> }>
) {
  let present = 0;
  let total = 0;
  for (const meeting of meetings) {
    const att = meeting.attendances[0];
    if (!att) continue;
    total++;
    if (MANDATE_PRESENT_CATEGORIES.has(att.category)) present++;
  }
  const rate = total > 0 ? Math.round(calculateAttendanceRate(present, total).rate) : 0;
  return { present, total, rate, goal: ROTARY_ATTENDANCE_GOAL };
}

function revalidateMyAccount() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/my-account`);
  }
}

async function requireMemberPortal() {
  return requireFeature("memberPortalEnabled");
}

export async function getMyAccountData() {
  const gate = await requireMemberPortal();
  if (gate.error) return { error: gate.error as string };
  const { ctx } = gate;

  const [member, user] = await Promise.all([
    prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: ctx.userId, isActive: true },
      include: {
        memberDues: {
          where: { fiscalYear: currentFiscalYear() },
          orderBy: { periodIndex: "asc" },
        },
        attendances: {
          include: {
            meeting: { select: { id: true, title: true, date: true, type: true } },
          },
          orderBy: { meeting: { date: "desc" } },
          take: 20,
        },
        assignedActions: {
          where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 20,
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true, firstName: true, lastName: true },
    }),
  ]);

  if (!member) {
    const emailMatch = user?.email
      ? await prisma.member.findFirst({
          where: {
            clubId: ctx.clubId,
            isActive: true,
            email: { equals: user.email, mode: "insensitive" },
            userId: null,
          },
          select: { id: true, firstName: true, lastName: true },
        })
      : null;

    return {
      linked: false as const,
      canAutoLink: !!emailMatch,
      emailMatchMember: emailMatch,
      userEmail: user?.email ?? null,
    };
  }

  const memberEmail = member.email?.toLowerCase();
  const mandate = getRotaryMandateYear();

  const [documents, emailLogs, mandateMeetings, finalizedMinutes, eventRegistrations, billing] =
    await Promise.all([
    prisma.clubDocument.findMany({
      where: {
        clubId: ctx.clubId,
        isArchived: false,
        OR: [
          { category: { in: ["MINUTE", "REPORT", "MANDATE"] } },
          { tags: { has: "member-portal" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        title: true,
        category: true,
        fileUrl: true,
        fileName: true,
        createdAt: true,
        minuteId: true,
      },
    }),
    memberEmail
      ? prisma.emailLog.findMany({
          where: {
            recipient: { equals: memberEmail, mode: "insensitive" },
            campaign: { clubId: ctx.clubId },
          },
          include: {
            campaign: { select: { name: true, subject: true, sentAt: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),
    prisma.meeting.findMany({
      where: {
        clubId: ctx.clubId,
        date: { gte: mandate.start, lte: mandate.end },
      },
      include: {
        attendances: {
          where: { memberId: member.id },
          select: { category: true },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.minute.findMany({
      where: { clubId: ctx.clubId, status: "FINALIZED" },
      orderBy: { finalizedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        finalizedAt: true,
        meeting: { select: { date: true, title: true } },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { memberId: member.id, event: { clubId: ctx.clubId } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.clubDuesPaymentSettings.findUnique({
      where: { clubId: ctx.clubId },
      select: { stripeEnabled: true, stripeSecretKey: true, paymentInstructions: true },
    }),
  ]);

  const duesSummary = {
    fiscalYear: currentFiscalYear(),
    totalDue: member.memberDues.reduce((sum, d) => sum + Number(d.amount), 0),
    totalPaid: member.memberDues
      .filter((d) => d.status === "PAID")
      .reduce((sum, d) => sum + Number(d.amount), 0),
    pending: member.memberDues.filter((d) => d.status === "PENDING" || d.status === "OVERDUE"),
    paid: member.memberDues.filter((d) => d.status === "PAID"),
  };

  const presentCount = member.attendances.filter(
    (a) => a.category === "PRESENT" || a.category === "TRAVEL_RETURN"
  ).length;
  const attendanceRate = computeRecordedAttendanceRate(member.attendances);
  const mandateAttendance = computeMandateAttendance(mandateMeetings);
  const locale = ctx.club.language === "EN" ? "en" : "fr";
  const stripeEnabled = await isClubDuesStripeEnabled(ctx.clubId);

  return {
    linked: true as const,
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      position: member.position,
      photoUrl: member.photoUrl,
      registrationNumber: member.registrationNumber,
    },
    duesSummary,
    attendances: member.attendances.map((a) => ({
      id: a.id,
      category: a.category,
      meeting: {
        id: a.meeting.id,
        title: a.meeting.title,
        date: a.meeting.date.toISOString(),
        type: a.meeting.type,
      },
    })),
    attendanceStats: {
      total: member.attendances.length,
      present: presentCount,
      rate: attendanceRate ?? 0,
    },
    mandateAttendance: {
      ...mandateAttendance,
      mandateLabel: mandate.label,
      onTrack: mandateAttendance.rate >= ROTARY_ATTENDANCE_GOAL,
    },
    finalizedMinutes: finalizedMinutes.map((m) => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meeting.date.toISOString(),
      meetingTitle: m.meeting.title,
      finalizedAt: m.finalizedAt?.toISOString() ?? null,
    })),
    eventRegistrations: eventRegistrations.map((r) => ({
      id: r.id,
      status: r.status,
      amount: r.amount ? Number(r.amount) : null,
      createdAt: r.createdAt.toISOString(),
      event: {
        id: r.event.id,
        title: r.event.title,
        startAt: r.event.startAt.toISOString(),
        location: r.event.location,
        status: r.event.status,
      },
    })),
    duesPayment: {
      stripeEnabled,
      payUrl: `/${locale}/members/dues`,
      pendingIds: duesSummary.pending.map((d) => d.id),
      paymentInstructions: billing?.paymentInstructions ?? null,
    },
    actions: member.assignedActions.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate?.toISOString() ?? null,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      fileUrl: documentViewUrl(d.id, d.fileUrl),
      downloadUrl: documentDownloadUrl(d.id, d.fileUrl),
      fileName: d.fileName,
      createdAt: d.createdAt.toISOString(),
      minuteId: d.minuteId,
    })),
    emailLogs: emailLogs.map((log) => ({
      id: log.id,
      status: log.status,
      createdAt: log.createdAt.toISOString(),
      openedAt: log.openedAt?.toISOString() ?? null,
      campaignName: log.campaign.name,
      subject: log.campaign.subject,
      sentAt: log.campaign.sentAt?.toISOString() ?? null,
    })),
  };
}

export async function linkMyMemberAccount() {
  const gate = await requireMemberPortal();
  if (gate.error) return { error: gate.error as string };
  const { ctx } = gate;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });
  if (!user?.email) return { error: "NO_EMAIL" as const };

  const member = await prisma.member.findFirst({
    where: {
      clubId: ctx.clubId,
      isActive: true,
      email: { equals: user.email, mode: "insensitive" },
      userId: null,
    },
  });
  if (!member) return { error: "NO_MATCH" as const };

  const existingLink = await prisma.member.findFirst({
    where: { clubId: ctx.clubId, userId: ctx.userId },
  });
  if (existingLink) return { error: "ALREADY_LINKED" as const };

  await prisma.member.update({
    where: { id: member.id },
    data: { userId: ctx.userId },
  });

  revalidateMyAccount();
  return { success: true as const, memberId: member.id };
}

export async function checkoutMemberDues(duesId: string, locale: string) {
  const gate = await requireMemberPortal();
  if (gate.error) return { error: gate.error as string };
  const { ctx } = gate;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });

  const result = await createMemberDuesCheckoutSession({
    duesId,
    clubId: ctx.clubId,
    userId: ctx.userId,
    locale,
    userEmail: user?.email,
  });

  if ("error" in result) return { error: result.error };
  return { url: result.url };
}