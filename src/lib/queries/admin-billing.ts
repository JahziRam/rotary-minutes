import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths } from "date-fns";
import {
  buildPaginatedResult,
  type ParsedListParams,
  type PaginatedResult,
} from "@/lib/server-list";

export type AdminBillingPaymentRow = {
  id: string;
  clubId: string;
  clubName: string;
  clubCity: string | null;
  kind: string;
  amountCents: number;
  currency: string;
  status: string;
  plan: string | null;
  billingInterval: string | null;
  paidAt: Date;
  stripeInvoiceId: string | null;
  stripeSessionId: string | null;
};

export type AdminBillingSummary = {
  totalRevenueCents: number;
  monthRevenueCents: number;
  paymentCount: number;
  monthPaymentCount: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  byPlan: Array<{ plan: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  recentMonths: Array<{ month: string; revenueCents: number; count: number }>;
};

export async function getAdminBillingSummary(): Promise<AdminBillingSummary> {
  const monthStart = startOfMonth(new Date());

  const [
    allPayments,
    monthPayments,
    paymentCount,
    monthPaymentCount,
    activeSubscriptions,
    trialingSubscriptions,
    byPlan,
    byStatus,
  ] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      _sum: { amountCents: true },
      where: { status: { in: ["paid", "succeeded"] } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: { in: ["paid", "succeeded"] },
        paidAt: { gte: monthStart },
      },
    }),
    prisma.subscriptionPayment.count({
      where: { status: { in: ["paid", "succeeded"] } },
    }),
    prisma.subscriptionPayment.count({
      where: {
        status: { in: ["paid", "succeeded"] },
        paidAt: { gte: monthStart },
      },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const recentMonths = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const start = startOfMonth(subMonths(new Date(), i));
      const end = startOfMonth(subMonths(new Date(), i - 1));
      return prisma.subscriptionPayment
        .aggregate({
          _sum: { amountCents: true },
          _count: { id: true },
          where: {
            status: { in: ["paid", "succeeded"] },
            paidAt: { gte: start, lt: end },
          },
        })
        .then((row) => ({
          month: start.toISOString().slice(0, 7),
          revenueCents: row._sum.amountCents ?? 0,
          count: row._count.id,
        }));
    })
  );

  return {
    totalRevenueCents: allPayments._sum.amountCents ?? 0,
    monthRevenueCents: monthPayments._sum.amountCents ?? 0,
    paymentCount,
    monthPaymentCount,
    activeSubscriptions,
    trialingSubscriptions,
    byPlan: byPlan.map((r) => ({ plan: r.plan, count: r._count.plan })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.status })),
    recentMonths: recentMonths.reverse(),
  };
}

export async function searchAdminBillingPayments(
  params: ParsedListParams
): Promise<PaginatedResult<AdminBillingPaymentRow>> {
  const where = params.q
    ? {
        OR: [
          { club: { name: { contains: params.q, mode: "insensitive" as const } } },
          { club: { city: { contains: params.q, mode: "insensitive" as const } } },
          { stripeInvoiceId: { contains: params.q, mode: "insensitive" as const } },
          { stripeSessionId: { contains: params.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.subscriptionPayment.count({ where }),
    prisma.subscriptionPayment.findMany({
      where,
      include: { club: { select: { name: true, city: true } } },
      orderBy: { paidAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    clubId: p.clubId,
    clubName: p.club.name,
    clubCity: p.club.city,
    kind: p.kind,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status,
    plan: p.plan,
    billingInterval: p.billingInterval,
    paidAt: p.paidAt,
    stripeInvoiceId: p.stripeInvoiceId,
    stripeSessionId: p.stripeSessionId,
  }));

  return buildPaginatedResult(items, total, params.page, params.pageSize);
}