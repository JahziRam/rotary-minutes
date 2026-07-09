import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear } from "@/lib/rotary";

export async function getTreasuryMandateDashboard(clubId: string) {
  const mandate = getRotaryMandateYear();
  const subAccounts = await prisma.treasurySubAccount.findMany({
    where: { clubId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      entries: {
        where: { date: { gte: mandate.start, lte: mandate.end } },
        select: { type: true, amount: true },
      },
    },
  });

  const rows = subAccounts.map((sa) => {
    let income = 0;
    let expense = 0;
    for (const e of sa.entries) {
      const amt = Number(e.amount);
      if (e.type === "INCOME") income += amt;
      else expense += amt;
    }
    const planned = sa.budgetPlanned ? Number(sa.budgetPlanned) : null;
    const actual = income - expense;
    const variance = planned != null ? actual - planned : null;
    return {
      id: sa.id,
      name: sa.name,
      code: sa.code,
      planned,
      income,
      expense,
      actual,
      variance,
      entryCount: sa.entries.length,
    };
  });

  const unassigned = await prisma.budgetEntry.findMany({
    where: {
      clubId,
      subAccountId: null,
      date: { gte: mandate.start, lte: mandate.end },
    },
    select: { type: true, amount: true },
  });

  let unassignedIncome = 0;
  let unassignedExpense = 0;
  for (const e of unassigned) {
    const amt = Number(e.amount);
    if (e.type === "INCOME") unassignedIncome += amt;
    else unassignedExpense += amt;
  }

  return {
    mandateLabel: mandate.label,
    mandateStart: mandate.start.toISOString(),
    mandateEnd: mandate.end.toISOString(),
    subAccounts: rows,
    unassigned: {
      income: unassignedIncome,
      expense: unassignedExpense,
      net: unassignedIncome - unassignedExpense,
    },
    totals: {
      planned: rows.reduce((s, r) => s + (r.planned ?? 0), 0),
      actual: rows.reduce((s, r) => s + r.actual, 0) + unassignedIncome - unassignedExpense,
      income: rows.reduce((s, r) => s + r.income, 0) + unassignedIncome,
      expense: rows.reduce((s, r) => s + r.expense, 0) + unassignedExpense,
    },
  };
}