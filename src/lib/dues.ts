import { addMonths, format, startOfMonth } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear } from "@/lib/rotary";
import type { DuesPaymentPlan } from "@/generated/prisma/client";

export function currentFiscalYear(date = new Date()): number {
  return getRotaryMandateYear(date).start.getFullYear();
}

export function fiscalYearLabel(year: number): string {
  return `${year}-${year + 1}`;
}

export function computePeriodAmount(annualAmount: number, plan: DuesPaymentPlan): number {
  if (plan === "MONTHLY") {
    return Math.round((annualAmount / 12) * 100) / 100;
  }
  return annualAmount;
}

export function buildPeriodSchedule(
  fiscalYear: number,
  plan: DuesPaymentPlan,
  annualAmount: number,
  locale: string
): Array<{ periodIndex: number; amount: number; dueDate: Date; label: string }> {
  const dateLocale = locale === "fr" ? fr : enUS;
  const mandateStart = new Date(fiscalYear, 6, 1);

  if (plan === "ANNUAL") {
    return [
      {
        periodIndex: 0,
        amount: annualAmount,
        dueDate: new Date(fiscalYear + 1, 2, 31),
        label: fiscalYearLabel(fiscalYear),
      },
    ];
  }

  const monthlyAmount = computePeriodAmount(annualAmount, "MONTHLY");
  const periods: Array<{ periodIndex: number; amount: number; dueDate: Date; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const dueDate = addMonths(startOfMonth(mandateStart), i);
    periods.push({
      periodIndex: i + 1,
      amount: monthlyAmount,
      dueDate,
      label: format(dueDate, "MMMM yyyy", { locale: dateLocale }),
    });
  }
  return periods;
}

export async function nextInvoiceNumber(clubId: string, fiscalYear: number): Promise<string> {
  const count = await prisma.memberDues.count({
    where: { clubId, fiscalYear, invoiceNumber: { not: null } },
  });
  return `INV-${fiscalYear}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextReceiptNumber(clubId: string, fiscalYear: number): Promise<string> {
  const [duesCount, paymentCount] = await Promise.all([
    prisma.memberDues.count({
      where: { clubId, fiscalYear, receiptNumber: { not: null } },
    }),
    prisma.duesPayment.count({
      where: { clubId, receiptNumber: { not: null } },
    }),
  ]);
  return `REC-${fiscalYear}-${String(duesCount + paymentCount + 1).padStart(4, "0")}`;
}

export function formatDuesMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function sumPaymentAmounts(
  payments: Array<{ amount: unknown }>
): number {
  return roundMoney(
    payments.reduce((sum, p) => sum + Number(p.amount), 0)
  );
}

export function duesRemaining(periodAmount: number, paidSoFar: number): number {
  return roundMoney(Math.max(0, periodAmount - paidSoFar));
}