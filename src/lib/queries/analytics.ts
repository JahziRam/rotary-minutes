import { addDays, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export interface ProductAnalytics {
  dauEstimate: number;
  wauEstimate: number;
  activeSessionsToday: number;
  featureUsage: Array<{ action: string; count: number }>;
  churnRisk: {
    expiringTrials: number;
    expiredTrials: number;
    pastDue: number;
    atRiskClubs: Array<{
      id: string;
      name: string;
      status: string;
      trialEndsAt: Date | null;
    }>;
  };
}

const FEATURE_ACTIONS = [
  "MINUTE_FINALIZED",
  "MINUTE_ARCHIVED",
  "MINUTE_DUPLICATED",
  "MINUTE_EMAILED",
  "EMAIL_COMPOSED",
  "EMAIL_SCHEDULED",
  "CLUB_REGISTERED",
  "SUBSCRIPTION_PLAN_CHOSEN",
  "MEETING_CREATED",
  "MEMBER_CREATED",
] as const;

export async function getProductAnalytics(): Promise<ProductAnalytics> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = subDays(dayStart, 7);
  const trialDeadline = addDays(now, 7);

  const [
    auditUsersToday,
    auditUsersWeek,
    activeSessionsToday,
    featureGroups,
    expiringTrials,
    expiredTrials,
    pastDue,
    atRiskClubs,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where: { createdAt: { gte: dayStart }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: weekStart }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.session.count({
      where: { expires: { gte: now } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: weekStart },
        action: { in: [...FEATURE_ACTIONS] },
      },
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    }),
    prisma.subscription.count({
      where: {
        status: "TRIALING",
        trialEndsAt: { lte: trialDeadline, gte: now },
      },
    }),
    prisma.subscription.count({
      where: {
        status: "TRIALING",
        trialEndsAt: { lt: now },
      },
    }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.findMany({
      where: {
        OR: [
          {
            status: "TRIALING",
            OR: [
              { trialEndsAt: { lte: trialDeadline } },
              { trialEndsAt: null },
            ],
          },
          { status: "PAST_DUE" },
        ],
      },
      include: { club: { select: { id: true, name: true } } },
      orderBy: { trialEndsAt: "asc" },
      take: 8,
    }),
  ]);

  const dauFromSessions = await prisma.session.findMany({
    where: { expires: { gte: dayStart } },
    select: { userId: true },
    distinct: ["userId"],
  });

  const dauEstimate = Math.max(auditUsersToday.length, dauFromSessions.length);
  const wauEstimate = Math.max(auditUsersWeek.length, activeSessionsToday);

  return {
    dauEstimate,
    wauEstimate,
    activeSessionsToday,
    featureUsage: featureGroups.map((g) => ({
      action: g.action,
      count: g._count.action,
    })),
    churnRisk: {
      expiringTrials,
      expiredTrials,
      pastDue,
      atRiskClubs: atRiskClubs.map((s) => ({
        id: s.club.id,
        name: s.club.name,
        status: s.status,
        trialEndsAt: s.trialEndsAt,
      })),
    },
  };
}