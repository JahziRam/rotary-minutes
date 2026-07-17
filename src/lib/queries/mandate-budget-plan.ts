import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear } from "@/lib/rotary";

export async function getMandateBudgetPlan(clubId: string, fiscalYear?: number) {
  const mandate = fiscalYear
    ? {
        start: new Date(fiscalYear, 6, 1),
        end: new Date(fiscalYear + 1, 5, 30, 23, 59, 59, 999),
        label: `${fiscalYear}-${fiscalYear + 1}`,
      }
    : getRotaryMandateYear();

  const year = mandate.start.getFullYear();

  const [subAccounts, projects, events, mandateDocs] = await Promise.all([
    prisma.treasurySubAccount.findMany({
      where: { clubId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        entries: {
          where: { date: { gte: mandate.start, lte: mandate.end } },
          select: { type: true, amount: true },
        },
      },
    }),
    prisma.clubProject.findMany({
      where: { clubId },
      select: {
        id: true,
        name: true,
        status: true,
        budgetPlanned: true,
        budgetEntries: {
          where: { date: { gte: mandate.start, lte: mandate.end } },
          select: { type: true, amount: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.clubEvent.findMany({
      where: {
        clubId,
        startAt: { gte: mandate.start, lte: mandate.end },
      },
      select: {
        id: true,
        title: true,
        status: true,
        budgetPlanned: true,
        startAt: true,
        budgetEntries: {
          select: { type: true, amount: true },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.budgetDocument.findMany({
      where: {
        clubId,
        mandateYear: year,
        projectId: null,
        eventId: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  function actualFromEntries(
    entries: Array<{ type: string; amount: unknown }>
  ) {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      const amt = Number(e.amount);
      if (e.type === "INCOME") income += amt;
      else expense += amt;
    }
    return { income, expense, actual: income - expense };
  }

  const subAccountRows = subAccounts.map((sa) => {
    const a = actualFromEntries(sa.entries);
    const planned = sa.budgetPlanned != null ? Number(sa.budgetPlanned) : null;
    return {
      id: sa.id,
      kind: "subAccount" as const,
      name: sa.name,
      code: sa.code,
      planned,
      ...a,
      variance: planned != null ? a.actual - planned : null,
    };
  });

  const projectRows = projects.map((p) => {
    const a = actualFromEntries(p.budgetEntries);
    const planned = p.budgetPlanned != null ? Number(p.budgetPlanned) : null;
    return {
      id: p.id,
      kind: "project" as const,
      name: p.name,
      status: p.status,
      planned,
      ...a,
      variance: planned != null ? a.actual - planned : null,
    };
  });

  const eventRows = events.map((e) => {
    const a = actualFromEntries(e.budgetEntries);
    const planned = e.budgetPlanned != null ? Number(e.budgetPlanned) : null;
    return {
      id: e.id,
      kind: "event" as const,
      name: e.title,
      status: e.status,
      startAt: e.startAt.toISOString(),
      planned,
      ...a,
      variance: planned != null ? a.actual - planned : null,
    };
  });

  const sum = (rows: Array<{ planned: number | null; income: number; expense: number; actual: number }>) => ({
    planned: rows.reduce((s, r) => s + (r.planned ?? 0), 0),
    income: rows.reduce((s, r) => s + r.income, 0),
    expense: rows.reduce((s, r) => s + r.expense, 0),
    actual: rows.reduce((s, r) => s + r.actual, 0),
  });

  const totals = sum([...subAccountRows, ...projectRows, ...eventRows]);

  return {
    mandateLabel: mandate.label,
    mandateYear: year,
    mandateStart: mandate.start.toISOString(),
    mandateEnd: mandate.end.toISOString(),
    subAccounts: subAccountRows,
    projects: projectRows,
    events: eventRows,
    totals: {
      ...totals,
      variance: totals.actual - totals.planned,
    },
    mandateDocuments: mandateDocs.map((d) => ({
      id: d.id,
      kind: d.kind,
      label: d.label,
      fileName: d.fileName,
      mimeType: d.mimeType,
      amount: d.amount != null ? Number(d.amount) : null,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}
