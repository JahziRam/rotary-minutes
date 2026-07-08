import { prisma } from "@/lib/prisma";
import {
  computeMonthlyBreakdown,
  currentMandateRange,
  listFiscalYearOptions,
  mandateRangeForYear,
} from "@/lib/budget-utils";
import { currentFiscalYear } from "@/lib/dues";
import type { BudgetEntryType } from "@/generated/prisma/client";

export type TreasuryFilters = {
  eventId?: string;
  type?: BudgetEntryType;
  from?: Date;
  to?: Date;
};

export async function getTreasuryEntries(clubId: string, filters?: TreasuryFilters) {
  const where: {
    clubId: string;
    eventId?: string;
    type?: BudgetEntryType;
    date?: { gte?: Date; lte?: Date };
  } = { clubId };

  if (filters?.eventId) where.eventId = filters.eventId;
  if (filters?.type) where.type = filters.type;
  if (filters?.from || filters?.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  return prisma.budgetEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { id: true, name: true, type: true } },
      event: { select: { id: true, title: true } },
      duesPayment: {
        select: {
          id: true,
          receiptNumber: true,
          member: { select: { firstName: true, lastName: true } },
        },
      },
      action: { select: { id: true, title: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });
}

export async function getTreasuryCategories(clubId: string) {
  return prisma.budgetCategory.findMany({
    where: { clubId, isActive: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getTreasuryCategoriesAll(clubId: string) {
  return prisma.budgetCategory.findMany({
    where: { clubId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getTreasuryEvents(clubId: string) {
  return prisma.clubEvent.findMany({
    where: { clubId, status: { in: ["PUBLISHED", "COMPLETED"] } },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true },
    take: 50,
  });
}

export async function getTreasurySummary(clubId: string, filters?: TreasuryFilters) {
  const entries = await getTreasuryEntries(clubId, filters);
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.type === "INCOME") income += amt;
    else expense += amt;
  }
  return { income, expense, balance: income - expense, count: entries.length };
}

export async function getTreasuryClubMeta(clubId: string) {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: { currency: true, name: true },
  });
}

export async function getTreasuryDashboardData(
  clubId: string,
  locale: string,
  fiscalYear?: number
) {
  const year = fiscalYear ?? currentFiscalYear();
  const range = mandateRangeForYear(year);
  const filters = { from: range.from, to: range.to };

  const [entries, categories, summary, club] = await Promise.all([
    getTreasuryEntries(clubId, filters),
    getTreasuryCategories(clubId),
    getTreasurySummary(clubId, filters),
    getTreasuryClubMeta(clubId),
  ]);

  const numericEntries = entries.map((e) => ({
    type: e.type,
    amount: Number(e.amount),
    date: e.date,
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? null,
  }));

  const incomeByCategory = categories
    .filter((c) => c.type === "INCOME")
    .map((c) => ({
      id: c.id,
      label: c.name,
      total: numericEntries
        .filter((e) => e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0);

  const expensesByCategory = categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => ({
      id: c.id,
      label: c.name,
      total: numericEntries
        .filter((e) => e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0);

  return {
    fiscalYear: year,
    fiscalYearLabel: range.label,
    fiscalYearOptions: listFiscalYearOptions(),
    exportFrom: range.from.toISOString(),
    exportTo: range.to.toISOString(),
    currency: club?.currency ?? "EUR",
    summary,
    monthlyBreakdown: computeMonthlyBreakdown(numericEntries, range.from, locale),
    incomeByCategory,
    expensesByCategory,
    entryCount: entries.length,
  };
}

export async function getTreasuryDashboardSummary(clubId: string) {
  const mandate = currentMandateRange();
  const summary = await getTreasurySummary(clubId, {
    from: mandate.from,
    to: mandate.to,
  });
  return { ...summary, fiscalYearLabel: mandate.label };
}