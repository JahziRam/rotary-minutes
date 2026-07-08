"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import {
  getTreasuryCategories,
  getTreasuryClubMeta,
  getTreasuryEntries,
  getTreasuryEvents,
  getTreasurySummary,
  type TreasuryFilters,
} from "@/lib/queries/treasury";
import { buildTreasuryReportPdfBuffer } from "@/lib/pdf/build-treasury-pdf";
import type { BudgetEntryType, PaymentMethod } from "@/generated/prisma/client";

function revalidateTreasury() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/treasury`);
  }
}

async function requireTreasuryView() {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "treasury.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireTreasuryManage() {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  return auth;
}

async function ensureDuesCategory(clubId: string) {
  const existing = await prisma.budgetCategory.findFirst({
    where: { clubId, type: "INCOME", name: { in: ["Cotisations", "Dues", "Member dues"] } },
  });
  if (existing) return existing.id;

  const created = await prisma.budgetCategory.create({
    data: { clubId, name: "Cotisations", type: "INCOME", sortOrder: 0 },
  });
  return created.id;
}

export async function listBudget(filters?: {
  eventId?: string;
  type?: BudgetEntryType;
  from?: string;
  to?: string;
}) {
  const auth = await requireTreasuryView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const parsed: TreasuryFilters = {
    eventId: filters?.eventId,
    type: filters?.type,
    from: filters?.from ? new Date(filters.from) : undefined,
    to: filters?.to ? new Date(filters.to) : undefined,
  };

  const [entries, categories, events, summary, club] = await Promise.all([
    getTreasuryEntries(ctx.clubId, parsed),
    getTreasuryCategories(ctx.clubId),
    getTreasuryEvents(ctx.clubId),
    getTreasurySummary(ctx.clubId, parsed),
    getTreasuryClubMeta(ctx.clubId),
  ]);

  const canManage = await hasRolePermission(ctx.role, "treasury.manage", ctx.isSuperAdmin);

  return {
    currency: club?.currency ?? "EUR",
    clubName: club?.name ?? "",
    canManage,
    summary,
    categories,
    events,
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      date: e.date.toISOString(),
      description: e.description,
      categoryId: e.categoryId,
      categoryName: e.category?.name ?? null,
      eventId: e.eventId,
      eventTitle: e.event?.title ?? null,
      duesPaymentId: e.duesPaymentId,
      duesMemberName: e.duesPayment
        ? `${e.duesPayment.member.firstName} ${e.duesPayment.member.lastName}`
        : null,
      actionId: e.actionId,
      actionTitle: e.action?.title ?? null,
      paymentMethod: e.paymentMethod,
      reference: e.reference,
      recordedBy: e.recordedBy
        ? `${e.recordedBy.firstName} ${e.recordedBy.lastName}`
        : null,
    })),
  };
}

export async function createEntry(data: {
  type: BudgetEntryType;
  amount: number;
  date: string;
  description: string;
  categoryId?: string;
  eventId?: string;
  actionId?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  currency?: string;
}) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true },
  });

  const entry = await prisma.budgetEntry.create({
    data: {
      clubId: ctx.clubId,
      type: data.type,
      amount: data.amount,
      currency: data.currency ?? club?.currency ?? "EUR",
      date: new Date(data.date),
      description: data.description,
      categoryId: data.categoryId || null,
      eventId: data.eventId || null,
      actionId: data.actionId || null,
      paymentMethod: data.paymentMethod || null,
      reference: data.reference || null,
      recordedById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "BUDGET_ENTRY_CREATED",
      entity: "BudgetEntry",
      entityId: entry.id,
      metadata: { type: data.type, amount: data.amount },
    },
  });

  const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
  void dispatchClubWebhook(ctx.clubId, "BUDGET_ENTRY_CREATED", {
    entryId: entry.id,
    type: data.type,
    amount: data.amount,
    description: data.description,
  });

  revalidateTreasury();
  return { success: true, entry };
}

export async function updateEntry(
  entryId: string,
  data: {
    type?: BudgetEntryType;
    amount?: number;
    date?: string;
    description?: string;
    categoryId?: string | null;
    eventId?: string | null;
    actionId?: string | null;
    paymentMethod?: PaymentMethod | null;
    reference?: string | null;
  }
) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.budgetEntry.findFirst({
    where: { id: entryId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.budgetEntry.update({
    where: { id: entryId },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.eventId !== undefined && { eventId: data.eventId }),
      ...(data.actionId !== undefined && { actionId: data.actionId }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.reference !== undefined && { reference: data.reference }),
    },
  });

  revalidateTreasury();
  return { success: true };
}

export async function deleteEntry(entryId: string) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.budgetEntry.findFirst({
    where: { id: entryId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.budgetEntry.delete({ where: { id: entryId } });
  revalidateTreasury();
  return { success: true };
}

/** Auto-create income entry when a dues payment is recorded. */
export async function syncDuesPayment(duesPaymentId: string, clubId: string, userId: string) {
  const features = await prisma.clubFeatures.findUnique({ where: { clubId } });
  if (!features?.treasuryEnabled) return { skipped: true };

  const existing = await prisma.budgetEntry.findFirst({
    where: { duesPaymentId, clubId },
  });
  if (existing) return { skipped: true, entryId: existing.id };

  const payment = await prisma.duesPayment.findFirst({
    where: { id: duesPaymentId, clubId },
    include: {
      member: { select: { firstName: true, lastName: true } },
      dues: { select: { periodLabel: true, fiscalYear: true } },
    },
  });
  if (!payment) return { error: "NOT_FOUND" as const };

  const categoryId = await ensureDuesCategory(clubId);
  const label =
    payment.dues?.periodLabel ??
    (payment.dues ? `${payment.dues.fiscalYear}-${payment.dues.fiscalYear + 1}` : "Cotisation");

  const entry = await prisma.budgetEntry.create({
    data: {
      clubId,
      type: "INCOME",
      amount: payment.amount,
      currency: payment.currency,
      date: payment.paidAt,
      description: `Cotisation — ${payment.member.firstName} ${payment.member.lastName} (${label})`,
      categoryId,
      duesPaymentId: payment.id,
      paymentMethod: payment.paymentMethod,
      reference: payment.receiptNumber,
      recordedById: userId,
    },
  });

  revalidateTreasury();
  return { success: true, entryId: entry.id };
}

export async function generateTreasuryReportPdf(opts?: {
  from?: string;
  to?: string;
  locale?: string;
}) {
  const auth = await requireTreasuryView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const locale = opts?.locale ?? (ctx.club.language === "EN" ? "en" : "fr");
  const filters: TreasuryFilters = {
    from: opts?.from ? new Date(opts.from) : undefined,
    to: opts?.to ? new Date(opts.to) : undefined,
  };

  const [entries, summary, club] = await Promise.all([
    getTreasuryEntries(ctx.clubId, filters),
    getTreasurySummary(ctx.clubId, filters),
    prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: {
        id: true,
        name: true,
        address: true,
        meetingLocation: true,
        logoUrl: true,
        language: true,
        currency: true,
      },
    }),
  ]);
  if (!club) return { error: "NOT_FOUND" as const };

  const pdf = await buildTreasuryReportPdfBuffer(
    club,
    entries.map((e) => ({
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      date: e.date,
      description: e.description,
      categoryName: e.category?.name ?? null,
      eventTitle: e.event?.title ?? null,
    })),
    summary,
    locale,
    filters
  );

  return { success: true, ...pdf };
}

export async function exportCsv(opts?: { from?: string; to?: string; eventId?: string }) {
  const auth = await requireTreasuryView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const filters: TreasuryFilters = {
    from: opts?.from ? new Date(opts.from) : undefined,
    to: opts?.to ? new Date(opts.to) : undefined,
    eventId: opts?.eventId,
  };

  const entries = await getTreasuryEntries(ctx.clubId, filters);
  const header = "Date,Type,Description,Category,Amount,Currency,Event,Reference\n";
  const rows = entries.map((e) => {
    const cols = [
      e.date.toISOString().slice(0, 10),
      e.type,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category?.name ?? "",
      Number(e.amount).toFixed(2),
      e.currency,
      e.event?.title ?? "",
      e.reference ?? "",
    ];
    return cols.join(",");
  });

  return { success: true, csv: header + rows.join("\n") };
}

// ─── Budget categories ─────────────────────────────────────────────────────────

export async function createBudgetCategory(data: {
  name: string;
  type: BudgetEntryType;
}) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const name = data.name.trim();
  if (!name) return { error: "INVALID_NAME" as const };

  const maxOrder = await prisma.budgetCategory.aggregate({
    where: { clubId: ctx.clubId, type: data.type },
    _max: { sortOrder: true },
  });

  const category = await prisma.budgetCategory.create({
    data: {
      clubId: ctx.clubId,
      name,
      type: data.type,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidateTreasury();
  return { success: true, category };
}

export async function toggleBudgetCategory(categoryId: string, isActive: boolean) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.budgetCategory.findFirst({
    where: { id: categoryId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.budgetCategory.update({
    where: { id: categoryId },
    data: { isActive },
  });

  revalidateTreasury();
  return { success: true };
}

// ─── Accounting exports (treasury module) ────────────────────────────────────

export async function exportTreasuryAccountingCsv(opts?: {
  from?: string;
  to?: string;
  locale?: string;
}) {
  const auth = await requireTreasuryView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const { loadTreasuryRows } = await import("@/actions/accounting-export");
  const { generateTreasuryCsv } = await import("@/lib/accounting-export");

  const locale = opts?.locale === "en" ? "en" : "fr";
  const rows = await loadTreasuryRows(
    ctx.clubId,
    opts?.from ? new Date(opts.from) : undefined,
    opts?.to ? new Date(opts.to) : undefined
  );

  return {
    success: true,
    csv: generateTreasuryCsv(rows, locale),
    filename: `treasury-journal-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function exportTreasuryAccountingOfx(opts?: { from?: string; to?: string }) {
  const auth = await requireTreasuryView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const { loadTreasuryRows } = await import("@/actions/accounting-export");
  const { generateTreasuryOfx } = await import("@/lib/accounting-export");

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true, slug: true },
  });

  const rows = await loadTreasuryRows(
    ctx.clubId,
    opts?.from ? new Date(opts.from) : undefined,
    opts?.to ? new Date(opts.to) : undefined
  );

  return {
    success: true,
    ofx: generateTreasuryOfx(rows, {
      accountId: club?.slug ?? ctx.clubId,
      currency: club?.currency ?? "EUR",
    }),
    filename: `treasury-${club?.slug ?? "club"}-${new Date().toISOString().slice(0, 10)}.ofx`,
  };
}