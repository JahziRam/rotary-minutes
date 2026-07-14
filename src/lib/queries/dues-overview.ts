import { prisma } from "@/lib/prisma";
import { currentFiscalYear, sumPaymentAmounts } from "@/lib/dues";
import type { DuesStatus } from "@/generated/prisma/client";

export type MemberDuesStatusInfo = {
  status: DuesStatus;
  amountDue: number;
  amountPaid: number;
};

function aggregateStatus(periods: Array<{ status: DuesStatus; amount: unknown; paidAt: Date | null }>): DuesStatus {
  if (periods.length === 0) return "PENDING";
  if (periods.some((p) => p.status === "OVERDUE")) return "OVERDUE";
  if (periods.some((p) => p.status === "PENDING")) return "PENDING";
  if (periods.every((p) => p.status === "PAID" || p.status === "WAIVED")) return "PAID";
  return "PENDING";
}

export async function getMembersDuesOverview(clubId: string, fiscalYear?: number) {
  const year = fiscalYear ?? currentFiscalYear();

  const [members, duesRows] = await Promise.all([
    prisma.member.findMany({
      where: { clubId, isActive: true },
      select: { id: true },
    }),
    prisma.memberDues.findMany({
      where: { clubId, fiscalYear: year },
      select: {
        memberId: true,
        status: true,
        amount: true,
        paidAt: true,
        payments: { select: { amount: true } },
      },
    }),
  ]);

  const byMember = new Map<string, typeof duesRows>();
  for (const row of duesRows) {
    const list = byMember.get(row.memberId) ?? [];
    list.push(row);
    byMember.set(row.memberId, list);
  }

  let expected = 0;
  let collected = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  const duesByMemberId: Record<string, MemberDuesStatusInfo> = {};

  for (const member of members) {
    const periods = byMember.get(member.id) ?? [];
    const amountDue = periods.reduce((s, p) => s + Number(p.amount), 0);
    const amountPaid = periods.reduce((s, p) => {
      if (p.status === "WAIVED") return s + Number(p.amount);
      if (p.status === "PAID") return s + Number(p.amount);
      return s + sumPaymentAmounts(p.payments);
    }, 0);
    const status = aggregateStatus(periods);

    expected += amountDue;
    collected += amountPaid;
    if (status === "PAID" || status === "WAIVED") paidCount++;
    else if (status === "OVERDUE") overdueCount++;
    else pendingCount++;

    if (periods.length > 0) {
      duesByMemberId[member.id] = { status, amountDue, amountPaid };
    }
  }

  return {
    fiscalYear: year,
    expected,
    collected,
    rate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
    paidCount,
    pendingCount,
    overdueCount,
    totalActive: members.length,
    duesByMemberId,
  };
}

export async function getMemberDuesHistory(clubId: string, memberId: string) {
  const year = currentFiscalYear();

  const [periods, payments, club] = await Promise.all([
    prisma.memberDues.findMany({
      where: { clubId, memberId },
      orderBy: [{ fiscalYear: "desc" }, { periodIndex: "asc" }],
      include: { payments: { select: { amount: true } } },
    }),
    prisma.duesPayment.findMany({
      where: { clubId, memberId },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
    prisma.club.findUnique({
      where: { id: clubId },
      select: { currency: true, defaultAnnualDues: true },
    }),
  ]);

  const currentPeriods = periods.filter((p) => p.fiscalYear === year);

  return {
    currentYear: year,
    currency: club?.currency ?? "EUR",
    defaultAnnualDues: club?.defaultAnnualDues ? Number(club.defaultAnnualDues) : null,
    currentPeriods,
    allPeriods: periods,
    payments,
    aggregateStatus: aggregateStatus(currentPeriods),
  };
}