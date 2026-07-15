import { prisma } from "@/lib/prisma";
import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";

export type ClubAnnouncementDelivery = {
  userIds: string[];
  emails: string[];
};

function uniqueEmails(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      values
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e))
    ),
  ];
}

async function activeMemberUserIds(clubId: string): Promise<Set<string>> {
  const rows = await prisma.clubMembership.findMany({
    where: { clubId, isActive: true, approvalStatus: "APPROVED" },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

async function emailsForUserIds(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });
  return uniqueEmails(users.map((u) => u.email));
}

async function memberEmailsByUserIds(
  clubId: string,
  userIds: string[]
): Promise<string[]> {
  if (!userIds.length) return [];
  const members = await prisma.member.findMany({
    where: { clubId, isActive: true, userId: { in: userIds } },
    select: { email: true, user: { select: { email: true } } },
  });
  return uniqueEmails(
    members.flatMap((m) => [m.email, m.user?.email])
  );
}

export async function resolveClubAnnouncementDelivery(opts: {
  clubId: string;
  targetType: ClubAnnouncementTarget;
  targetRoles: ClubRole[];
  targetCommissionId?: string | null;
}): Promise<ClubAnnouncementDelivery> {
  const { clubId, targetType, targetRoles, targetCommissionId } = opts;
  const activeUserIds = await activeMemberUserIds(clubId);

  if (targetType === "ALL_MEMBERS") {
    const userIds = [...activeUserIds];
    const emails = uniqueEmails([
      ...(await emailsForUserIds(userIds)),
      ...(await memberEmailsByUserIds(clubId, userIds)),
    ]);
    return { userIds, emails };
  }

  if (targetType === "ROLES") {
    const roles =
      targetRoles.length > 0
        ? targetRoles
        : ([
            "PRESIDENT",
            "VICE_PRESIDENT",
            "SECRETARY",
            "TREASURER",
            "ADMIN",
            "MEMBERSHIP_CHAIR",
            "COMMISSION_CHAIR",
          ] as ClubRole[]);
    const rows = await prisma.clubMembership.findMany({
      where: { clubId, isActive: true, role: { in: roles } },
      select: { userId: true },
    });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const emails = uniqueEmails([
      ...(await emailsForUserIds(userIds)),
      ...(await memberEmailsByUserIds(clubId, userIds)),
    ]);
    return { userIds, emails };
  }

  if (targetType === "COMMISSION" && targetCommissionId) {
    const members = await prisma.member.findMany({
      where: { clubId, isActive: true, commissionId: targetCommissionId },
      select: { userId: true, email: true },
    });
    const userIds = [
      ...new Set(
        members.map((m) => m.userId).filter((id): id is string => Boolean(id))
      ),
    ];
    const emails = uniqueEmails(members.map((m) => m.email));
    return { userIds, emails };
  }

  if (targetType === "DUES_OVERDUE" || targetType === "DUES_PENDING") {
    const status = targetType === "DUES_OVERDUE" ? "OVERDUE" : "PENDING";
    const dues = await prisma.memberDues.findMany({
      where: { clubId, status },
      select: {
        member: { select: { userId: true, email: true } },
      },
    });
    const userIds = [
      ...new Set(
        dues
          .map((d) => d.member.userId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const emails = uniqueEmails(dues.map((d) => d.member.email));
    return { userIds, emails };
  }

  if (targetType === "NO_APP_ACCOUNT") {
    const members = await prisma.member.findMany({
      where: { clubId, isActive: true, email: { not: null } },
      select: { userId: true, email: true },
    });

    const emailsOnly = members.filter((m) => {
      if (m.userId && activeUserIds.has(m.userId)) return false;
      if (!m.email) return false;
      return true;
    });

    const userIds = emailsOnly
      .map((m) => m.userId)
      .filter((id): id is string => Boolean(id && !activeUserIds.has(id)));

    const emails = uniqueEmails(emailsOnly.map((m) => m.email));

    return { userIds: [...new Set(userIds)], emails };
  }

  return { userIds: [], emails: [] };
}