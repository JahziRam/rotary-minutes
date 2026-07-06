import { prisma } from "@/lib/prisma";
import { addDays, startOfMonth } from "date-fns";

export async function getAdminStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const trialDeadline = addDays(now, 7);

  const [
    clubsActive,
    clubsInactive,
    usersCount,
    activeSubscriptions,
    trialingCount,
    trialsExpiringSoon,
    minutesThisMonth,
    finalizedThisMonth,
    finalizedMinutes,
    newClubsThisMonth,
    totalMeetings,
    totalMembers,
  ] = await Promise.all([
    prisma.club.count({ where: { isActive: true } }),
    prisma.club.count({ where: { isActive: false } }),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({
      where: {
        status: "TRIALING",
        OR: [
          { trialEndsAt: { lte: trialDeadline } },
          { trialEndsAt: null },
        ],
      },
    }),
    prisma.minute.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.minute.count({
      where: { status: "FINALIZED", finalizedAt: { gte: monthStart } },
    }),
    prisma.minute.count({ where: { status: "FINALIZED" } }),
    prisma.club.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.meeting.count(),
    prisma.member.count({ where: { isActive: true } }),
  ]);

  return {
    clubsActive,
    clubsInactive,
    usersCount,
    activeSubscriptions,
    trialingCount,
    trialsExpiringSoon,
    minutesThisMonth,
    finalizedThisMonth,
    finalizedMinutes,
    newClubsThisMonth,
    totalMeetings,
    totalMembers,
  };
}

const adminClubsInclude = {
  subscription: true,
  _count: {
    select: { members: true, meetings: true, minutes: true, memberships: true },
  },
} as const;

export async function getAdminClubs() {
  try {
    return await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      include: { ...adminClubsInclude, features: true },
    });
  } catch (e) {
    console.error("[getAdminClubs] features query failed, falling back:", e);
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      include: adminClubsInclude,
    });
    return clubs.map((club) => ({ ...club, features: null }));
  }
}

export async function getExpiringTrials() {
  const now = new Date();
  const deadline = addDays(now, 7);

  return prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      OR: [
        { trialEndsAt: { lte: deadline } },
        { trialEndsAt: null },
      ],
    },
    include: { club: { select: { id: true, name: true, city: true, country: true } } },
    orderBy: { trialEndsAt: "asc" },
    take: 10,
  });
}

export async function getSubscriptionBreakdown() {
  const [byPlan, byStatus] = await Promise.all([
    prisma.subscription.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  return { byPlan, byStatus };
}

export async function getAdminAuditLogs(limit = 25) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      club: { select: { name: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
}