import type { BudgetEntryType } from "@/generated/prisma/client";
import { getRotaryMandateYear } from "@/lib/rotary";
import { formatMoneyAmount } from "@/lib/currency";

export function formatBudgetMoney(amount: number, currency: string, locale: string): string {
  return formatMoneyAmount(amount, currency, locale, { maximumFractionDigits: 2 });
}

export function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes(";")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fiscalYearLabel(year: number): string {
  return `${year}-${year + 1}`;
}

export function mandateRangeForYear(fiscalYear: number) {
  return {
    from: new Date(fiscalYear, 6, 1),
    to: new Date(fiscalYear + 1, 5, 30, 23, 59, 59, 999),
    label: fiscalYearLabel(fiscalYear),
  };
}

export function listFiscalYearOptions(count = 5, ref = new Date()): number[] {
  const current = getRotaryMandateYear(ref).start.getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

export function computeMonthlyBreakdown(
  entries: Array<{ type: BudgetEntryType; amount: number; date: Date }>,
  yearStart: Date,
  locale: string
): Array<{ month: number; label: string; income: number; expense: number }> {
  const months: Array<{ month: number; label: string; income: number; expense: number }> = [];
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  for (let i = 0; i < 12; i++) {
    const d = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1);
    months.push({
      month: d.getMonth() + 1,
      label: d.toLocaleDateString(dateLocale, { month: "short" }),
      income: 0,
      expense: 0,
    });
  }

  for (const entry of entries) {
    const idx =
      (entry.date.getFullYear() - yearStart.getFullYear()) * 12 +
      (entry.date.getMonth() - yearStart.getMonth());
    if (idx < 0 || idx >= 12) continue;
    if (entry.type === "INCOME") months[idx]!.income += entry.amount;
    else months[idx]!.expense += entry.amount;
  }

  return months;
}

export function currentMandateRange(ref = new Date()) {
  const mandate = getRotaryMandateYear(ref);
  return { from: mandate.start, to: mandate.end, label: mandate.label };
}