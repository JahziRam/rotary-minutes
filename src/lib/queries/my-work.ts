import { prisma } from "@/lib/prisma";

/** Resolve member ids for the current user in a club (active). */
export async function getMyMemberIds(clubId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { clubId, userId, isActive: true },
    select: { id: true },
  });
  return member ? [member.id] : [];
}

/** Commission ids for a member (multi-membership + legacy). */
export async function getMemberCommissionIds(memberId: string) {
  const [memberships, legacy] = await Promise.all([
    prisma.commissionMembership.findMany({
      where: { memberId },
      select: { commissionId: true },
    }),
    prisma.member.findUnique({
      where: { id: memberId },
      select: { commissionId: true },
    }),
  ]);
  const ids = new Set(memberships.map((m) => m.commissionId));
  if (legacy?.commissionId) ids.add(legacy.commissionId);
  return [...ids];
}

export async function getMyAssignedActions(clubId: string, userId: string) {
  const memberIds = await getMyMemberIds(clubId, userId);
  if (memberIds.length === 0) return [];
  const memberId = memberIds[0]!;
  const commissionIds = await getMemberCommissionIds(memberId);

  return prisma.clubAction.findMany({
    where: {
      clubId,
      status: { in: ["OPEN", "IN_PROGRESS", "DEFERRED"] },
      OR: [
        { responsibleMemberId: memberId },
        { assignees: { some: { memberId } } },
        ...(commissionIds.length
          ? [{ commissionId: { in: commissionIds } }]
          : []),
      ],
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 50,
    include: {
      project: { select: { id: true, name: true } },
      commission: { select: { id: true, name: true } },
    },
  });
}

export async function getMyAssignedProjects(clubId: string, userId: string) {
  const memberIds = await getMyMemberIds(clubId, userId);
  if (memberIds.length === 0) return [];
  const memberId = memberIds[0]!;
  const commissionIds = await getMemberCommissionIds(memberId);

  return prisma.clubProject.findMany({
    where: {
      clubId,
      status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
      OR: [
        { ownerMemberId: memberId },
        { assignees: { some: { memberId } } },
        ...(commissionIds.length
          ? [{ commissionId: { in: commissionIds } }]
          : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      commission: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
  });
}
