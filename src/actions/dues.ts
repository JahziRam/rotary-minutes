"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { requireFeature } from "@/lib/require-feature";
import { duesInvoiceEmail, duesReceiptEmail, duesHistoryEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import {
  buildDuesHistoryPdfBuffer,
  buildDuesInvoicePdfBuffer,
  buildDuesReceiptPdfBuffer,
} from "@/lib/pdf/build-dues-pdf";
import {
  buildPeriodSchedule,
  currentFiscalYear,
  fiscalYearLabel,
  nextInvoiceNumber,
  nextReceiptNumber,
} from "@/lib/dues";
import type { DuesPaymentPlan, DuesStatus, PaymentMethod } from "@/generated/prisma/client";

function revalidateDues() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/members/dues`);
    revalidatePath(`/${loc}/settings`);
  }
}

async function requireDuesView() {
  const feature = await requireFeature("duesEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "dues.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireDuesManage() {
  const feature = await requireFeature("duesEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("dues.manage");
  if (auth.error) return auth;
  return auth;
}

const clubDuesSelect = {
  id: true,
  name: true,
  address: true,
  meetingLocation: true,
  logoUrl: true,
  language: true,
  currency: true,
  defaultAnnualDues: true,
  duesAutoInvoiceEmail: true,
  duesAutoReceiptEmail: true,
} as const;

export async function listMemberDues(fiscalYear?: number) {
  const auth = await requireDuesView();
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const { ctx } = auth;
  const year = fiscalYear ?? currentFiscalYear();

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: clubDuesSelect,
  });

  const [members, duesRows, myMember] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: ctx.clubId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.memberDues.findMany({
      where: { clubId: ctx.clubId, fiscalYear: year },
      orderBy: [{ memberId: "asc" }, { periodIndex: "asc" }],
    }),
    prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: ctx.userId, isActive: true },
      select: { id: true },
    }),
  ]);

  const duesByMember = new Map<string, typeof duesRows>();
  for (const d of duesRows) {
    const list = duesByMember.get(d.memberId) ?? [];
    list.push(d);
    duesByMember.set(d.memberId, list);
  }

  const canManage = await hasRolePermission(ctx.role, "dues.manage", ctx.isSuperAdmin);

  return {
    fiscalYear: year,
    currency: club?.currency ?? "EUR",
    defaultAnnualDues: club?.defaultAnnualDues ? Number(club.defaultAnnualDues) : null,
    duesAutoInvoiceEmail: club?.duesAutoInvoiceEmail ?? false,
    duesAutoReceiptEmail: club?.duesAutoReceiptEmail ?? true,
    canManage,
    myMemberId: myMember?.id ?? null,
    rows: members.map((member) => ({
      member,
      periods: duesByMember.get(member.id) ?? [],
      nextDue: (duesByMember.get(member.id) ?? []).find(
        (p) => p.status === "PENDING" || p.status === "OVERDUE"
      ) ?? null,
    })),
  };
}

export async function getMemberDuesHistory(memberId: string, fiscalYear?: number) {
  const auth = await requireDuesView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const year = fiscalYear ?? currentFiscalYear();
  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  const [periods, payments] = await Promise.all([
    prisma.memberDues.findMany({
      where: { clubId: ctx.clubId, memberId, fiscalYear: year },
      orderBy: { periodIndex: "asc" },
    }),
    prisma.duesPayment.findMany({
      where: { clubId: ctx.clubId, memberId },
      orderBy: { paidAt: "desc" },
      take: 50,
    }),
  ]);

  return { member, fiscalYear: year, periods, payments };
}

export async function updateMemberDuesPlan(
  memberId: string,
  plan: DuesPaymentPlan,
  _locale: string
) {
  const feature = await requireFeature("duesEnabled");
  if (feature.error) return feature;
  const { ctx } = feature;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId, isActive: true },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  const canManage = await hasRolePermission(ctx.role, "dues.manage", ctx.isSuperAdmin);
  const isSelf = member.userId === ctx.userId;
  if (!canManage && !isSelf) return { error: "FORBIDDEN" as const };

  await prisma.member.update({
    where: { id: memberId },
    data: { duesPaymentPlan: plan },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "DUES_PLAN_UPDATED",
      entity: "Member",
      entityId: memberId,
      metadata: { plan },
    },
  });

  revalidateDues();
  return { success: true };
}

export async function updateDuesSettings(data: {
  defaultAnnualDues?: number | null;
  currency?: string;
  duesAutoInvoiceEmail?: boolean;
  duesAutoReceiptEmail?: boolean;
}) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: {
      ...(data.defaultAnnualDues !== undefined && {
        defaultAnnualDues: data.defaultAnnualDues,
      }),
      ...(data.currency && { currency: data.currency }),
      ...(data.duesAutoInvoiceEmail !== undefined && {
        duesAutoInvoiceEmail: data.duesAutoInvoiceEmail,
      }),
      ...(data.duesAutoReceiptEmail !== undefined && {
        duesAutoReceiptEmail: data.duesAutoReceiptEmail,
      }),
    },
  });

  revalidateDues();
  return { success: true };
}

export async function bulkCreateDuesForYear(opts?: {
  fiscalYear?: number;
  amount?: number;
}) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const fiscalYear = opts?.fiscalYear ?? currentFiscalYear();
  const locale = ctx.club.language === "EN" ? "en" : "fr";

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { defaultAnnualDues: true, currency: true, duesAutoInvoiceEmail: true },
  });

  const annualAmount =
    opts?.amount ?? (club?.defaultAnnualDues ? Number(club.defaultAnnualDues) : null);
  if (annualAmount == null || annualAmount <= 0) return { error: "NO_DEFAULT_AMOUNT" as const };

  const members = await prisma.member.findMany({
    where: { clubId: ctx.clubId, isActive: true },
    select: { id: true, duesPaymentPlan: true },
  });

  const existing = await prisma.memberDues.findMany({
    where: { clubId: ctx.clubId, fiscalYear },
    select: { memberId: true, periodIndex: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.memberId}:${e.periodIndex}`));

  const toCreate: Array<{
    clubId: string;
    memberId: string;
    fiscalYear: number;
    periodIndex: number;
    periodLabel: string;
    paymentPlan: DuesPaymentPlan;
    amount: number;
    currency: string;
    dueDate: Date;
    status: DuesStatus;
    invoiceNumber: string;
  }> = [];

  for (const member of members) {
    const schedule = buildPeriodSchedule(
      fiscalYear,
      member.duesPaymentPlan,
      annualAmount,
      locale
    );
    for (const period of schedule) {
      const key = `${member.id}:${period.periodIndex}`;
      if (existingKeys.has(key)) continue;
      const invoiceNumber = await nextInvoiceNumber(ctx.clubId, fiscalYear);
      toCreate.push({
        clubId: ctx.clubId,
        memberId: member.id,
        fiscalYear,
        periodIndex: period.periodIndex,
        periodLabel: period.label,
        paymentPlan: member.duesPaymentPlan,
        amount: period.amount,
        currency: club?.currency ?? "EUR",
        dueDate: period.dueDate,
        status: "PENDING",
        invoiceNumber,
      });
    }
  }

  if (toCreate.length === 0) return { success: true, created: 0 };

  await prisma.memberDues.createMany({ data: toCreate });

  if (club?.duesAutoInvoiceEmail) {
    const invoiceNumbers = toCreate.map((r) => r.invoiceNumber);
    const created = await prisma.memberDues.findMany({
      where: { clubId: ctx.clubId, fiscalYear, invoiceNumber: { in: invoiceNumbers } },
      select: { id: true },
    });
    for (const { id } of created) {
      void sendDuesInvoiceEmail(id, undefined, locale);
    }
  }

  revalidateDues();
  return { success: true, created: toCreate.length };
}

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CHECK",
  "BANK_TRANSFER",
  "STRIPE",
  "MOBILE_MONEY",
  "OTHER",
];

export async function markDuesPaid(
  duesId: string,
  opts?: {
    notes?: string;
    method?: string;
    paymentMethod?: PaymentMethod;
    sendReceipt?: boolean;
  },
  locale = "fr"
) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.memberDues.findFirst({
    where: { id: duesId, clubId: ctx.clubId },
    include: { member: true },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing.status === "PAID") return { error: "ALREADY_PAID" as const };

  const receiptNumber =
    existing.receiptNumber ?? (await nextReceiptNumber(ctx.clubId, existing.fiscalYear));
  const paidAt = new Date();
  const paymentMethod =
    opts?.paymentMethod ??
    (opts?.method && PAYMENT_METHODS.includes(opts.method as PaymentMethod)
      ? (opts.method as PaymentMethod)
      : undefined);

  const payment = await prisma.$transaction(async (tx) => {
    await tx.memberDues.update({
      where: { id: duesId },
      data: {
        status: "PAID" as DuesStatus,
        paidAt,
        receiptNumber,
        ...(opts?.notes !== undefined && { notes: opts.notes || null }),
      },
    });
    return tx.duesPayment.create({
      data: {
        clubId: ctx.clubId,
        memberId: existing.memberId,
        duesId,
        amount: existing.amount,
        currency: existing.currency,
        paidAt,
        method: paymentMethod ?? opts?.method ?? null,
        paymentMethod: paymentMethod ?? null,
        receiptNumber,
        notes: opts?.notes || null,
        recordedById: ctx.userId,
      },
    });
  });

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: clubDuesSelect,
  });

  const shouldSend =
    opts?.sendReceipt ?? club?.duesAutoReceiptEmail ?? true;
  if (shouldSend && existing.member.email) {
    await sendDuesReceiptEmail(duesId, locale, false);
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "DUES_MARKED_PAID",
      entity: "MemberDues",
      entityId: duesId,
      metadata: { receiptNumber, method: paymentMethod ?? opts?.method },
    },
  });

  const { dispatchDuesPaidWebhook } = await import("@/lib/club-webhooks");
  dispatchDuesPaidWebhook(ctx.clubId, {
    duesId,
    memberId: existing.memberId,
    amount: Number(existing.amount),
    currency: existing.currency,
    paymentMethod: paymentMethod ?? opts?.method ?? null,
    receiptNumber,
    paidAt: paidAt.toISOString(),
  });

  const { syncDuesPayment } = await import("@/actions/treasury");
  void syncDuesPayment(payment.id, ctx.clubId, ctx.userId);

  revalidateDues();
  return { success: true, receiptNumber, paymentId: payment.id };
}

export async function updateDuesStatus(
  duesId: string,
  status: DuesStatus,
  notes?: string
) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.memberDues.findFirst({
    where: { id: duesId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.memberDues.update({
    where: { id: duesId },
    data: {
      status,
      ...(status !== "PAID" && { paidAt: null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  revalidateDues();
  return { success: true };
}

async function loadDuesForEmail(duesId: string, clubId: string) {
  return prisma.memberDues.findFirst({
    where: { id: duesId, clubId },
    include: {
      member: true,
      club: { select: clubDuesSelect },
    },
  });
}

export async function sendDuesInvoiceEmail(
  duesIdOrMemberId: string,
  invoiceRef?: string,
  locale = "fr",
  byMemberId = false
) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  let dues = await loadDuesForEmail(duesIdOrMemberId, ctx.clubId);
  if (!dues && byMemberId) {
    dues = await prisma.memberDues.findFirst({
      where: {
        memberId: duesIdOrMemberId,
        clubId: ctx.clubId,
        invoiceNumber: invoiceRef,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: { member: true, club: { select: clubDuesSelect } },
    });
  }
  if (!dues) return { error: "NOT_FOUND" as const };
  const recipientEmail = dues.member.email;
  if (!recipientEmail) return { error: "NO_EMAIL" as const };

  if (!dues.invoiceNumber) {
    const invoiceNumber = await nextInvoiceNumber(ctx.clubId, dues.fiscalYear);
    dues = await prisma.memberDues.update({
      where: { id: dues.id },
      data: { invoiceNumber },
      include: { member: true, club: { select: clubDuesSelect } },
    });
  }

  const pdf = await buildDuesInvoicePdfBuffer(dues.club, dues.member, dues, locale);
  const mail = duesInvoiceEmail({
    clubName: dues.club.name,
    clubId: dues.club.id,
    memberName: `${dues.member.firstName} ${dues.member.lastName}`,
    periodLabel: dues.periodLabel ?? fiscalYearLabel(dues.fiscalYear),
    amount: `${Number(dues.amount)} ${dues.currency}`,
    dueDate: dues.dueDate.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US"),
    locale,
    logoUrl: dues.club.logoUrl ?? undefined,
  });

  const result = await sendClubEmail(ctx.clubId, {
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
    attachments: [...(mail.attachments ?? []), { filename: pdf.filename, content: pdf.buffer }],
  });

  await prisma.memberDues.update({
    where: { id: dues.id },
    data: { invoiceSentAt: new Date() },
  });

  return {
    success: true,
    emailed: result.ok,
    message: result.ok
      ? locale === "fr"
        ? `Facture envoyée à ${recipientEmail}`
        : `Invoice sent to ${recipientEmail}`
      : result.error,
  };
}

export async function sendDuesReceiptEmail(
  duesId: string,
  locale = "fr",
  requireManage = true
) {
  const ctx = requireManage ? await requireDuesManage() : await requireDuesView();
  if ("error" in ctx && ctx.error) return ctx;

  const { ctx: clubCtx } = ctx as { ctx: NonNullable<Awaited<ReturnType<typeof getClubContext>>> };
  const dues = await loadDuesForEmail(duesId, clubCtx.clubId);
  if (!dues) return { error: "NOT_FOUND" as const };
  if (dues.status !== "PAID") return { error: "NOT_PAID" as const };
  const recipientEmail = dues.member.email;
  if (!recipientEmail) return { error: "NO_EMAIL" as const };

  const pdf = await buildDuesReceiptPdfBuffer(dues.club, dues.member, dues, locale);
  const mail = duesReceiptEmail({
    clubName: dues.club.name,
    clubId: dues.club.id,
    memberName: `${dues.member.firstName} ${dues.member.lastName}`,
    periodLabel: dues.periodLabel ?? fiscalYearLabel(dues.fiscalYear),
    amount: `${Number(dues.amount)} ${dues.currency}`,
    receiptNumber: dues.receiptNumber ?? "",
    locale,
    logoUrl: dues.club.logoUrl ?? undefined,
  });

  const result = await sendClubEmail(clubCtx.clubId, {
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
    attachments: [...(mail.attachments ?? []), { filename: pdf.filename, content: pdf.buffer }],
  });

  await prisma.memberDues.update({
    where: { id: dues.id },
    data: { receiptSentAt: new Date() },
  });

  return { success: true, emailed: result.ok };
}

export async function sendMemberDuesHistoryEmail(
  memberId: string,
  fiscalYear?: number,
  locale = "fr"
) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const year = fiscalYear ?? currentFiscalYear();
  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!member) return { error: "NOT_FOUND" as const };
  const recipientEmail = member.email;
  if (!recipientEmail) return { error: "NO_EMAIL" as const };

  const [club, periods] = await Promise.all([
    prisma.club.findUnique({ where: { id: ctx.clubId }, select: clubDuesSelect }),
    prisma.memberDues.findMany({
      where: { clubId: ctx.clubId, memberId, fiscalYear: year },
      orderBy: { periodIndex: "asc" },
    }),
  ]);
  if (!club) return { error: "NOT_FOUND" as const };

  const pdf = await buildDuesHistoryPdfBuffer(club, member, periods, locale);
  const mail = duesHistoryEmail({
    clubName: club.name,
    clubId: club.id,
    memberName: `${member.firstName} ${member.lastName}`,
    fiscalYear: fiscalYearLabel(year),
    locale,
    logoUrl: club.logoUrl ?? undefined,
  });

  const result = await sendClubEmail(ctx.clubId, {
    to: recipientEmail,
    subject: mail.subject,
    html: mail.html,
    attachments: [...(mail.attachments ?? []), { filename: pdf.filename, content: pdf.buffer }],
  });

  return {
    success: true,
    emailed: result.ok,
    message: result.ok
      ? locale === "fr"
        ? `Historique envoyé à ${recipientEmail}`
        : `History sent to ${recipientEmail}`
      : result.error,
  };
}

export async function createMemberDues(data: {
  memberId: string;
  fiscalYear?: number;
  amount: number;
  dueDate: string;
  currency?: string;
  notes?: string;
}) {
  const auth = await requireDuesManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: data.memberId, clubId: ctx.clubId, isActive: true },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  const fiscalYear = data.fiscalYear ?? currentFiscalYear();
  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true },
  });

  const existing = await prisma.memberDues.findFirst({
    where: { memberId: data.memberId, fiscalYear, periodIndex: 0 },
  });
  if (existing) return { error: "ALREADY_EXISTS" as const };

  const invoiceNumber = await nextInvoiceNumber(ctx.clubId, fiscalYear);
  const dues = await prisma.memberDues.create({
    data: {
      clubId: ctx.clubId,
      memberId: data.memberId,
      fiscalYear,
      periodIndex: 0,
      periodLabel: fiscalYearLabel(fiscalYear),
      paymentPlan: member.duesPaymentPlan,
      amount: data.amount,
      currency: data.currency ?? club?.currency ?? "EUR",
      dueDate: new Date(data.dueDate),
      notes: data.notes || null,
      status: "PENDING",
      invoiceNumber,
    },
  });

  revalidateDues();
  return { success: true, dues };
}