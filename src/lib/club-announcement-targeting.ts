import { prisma } from "@/lib/prisma";
import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";

export async function resolveClubAnnouncementRecipients(opts: {
  clubId: string;
  targetType: ClubAnnouncementTarget;
  targetRoles: ClubRole[];
  targetCommissionId?: string | null;
}): Promise<string[]> {
  const { clubId, targetType, targetRoles, targetCommissionId } = opts;

  if (targetType === "ALL_MEMBERS") {
    const rows = await prisma.clubMembership.findMany({
      where: { clubId, isActive: true, approvalStatus: "APPROVED" },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
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
    return [...new Set(rows.map((r) => r.userId))];
  }

  if (targetType === "COMMISSION" && targetCommissionId) {
    const members = await prisma.member.findMany({
      where: { clubId, isActive: true, commissionId: targetCommissionId, userId: { not: null } },
      select: { userId: true },
    });
    return [...new Set(members.map((m) => m.userId!).filter(Boolean))];
  }

  if (targetType === "DUES_OVERDUE" || targetType === "DUES_PENDING") {
    const status = targetType === "DUES_OVERDUE" ? "OVERDUE" : "PENDING";
    const dues = await prisma.memberDues.findMany({
      where: { clubId, status },
      select: { member: { select: { userId: true } } },
    });
    return [
      ...new Set(
        dues.map((d) => d.member.userId).filter((id): id is string => Boolean(id))
      ),
    ];
  }

  if (targetType === "NO_APP_ACCOUNT") {
    const members = await prisma.member.findMany({
      where: { clubId, isActive: true, OR: [{ userId: null }, { email: null }] },
      select: { userId: true, email: true },
    });
    const emails = members.filter((m) => !m.userId && m.email).map((m) => m.email!.toLowerCase());
    const users =
      emails.length > 0
        ? await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true },
          })
        : [];
    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

    const withAccounts = await prisma.clubMembership.findMany({
      where: { clubId, isActive: true },
      select: { userId: true },
    });
    const activeUserIds = new Set(withAccounts.map((m) => m.userId));

    const memberIds = members
      .filter((m) => {
        if (m.userId) return !activeUserIds.has(m.userId);
        if (m.email) {
          const uid = userByEmail.get(m.email.toLowerCase());
          return !uid || !activeUserIds.has(uid);
        }
        return true;
      })
      .map((m) => m.userId)
      .filter((id): id is string => Boolean(id));

    return [...new Set(memberIds)];
  }

  return [];
}