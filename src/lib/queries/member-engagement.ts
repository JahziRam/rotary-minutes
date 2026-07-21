import { prisma } from "@/lib/prisma";
import { formatPersonName } from "@/lib/format-person-name";

export type MemberEngagementKind =
  | "login"
  | "minute_read"
  | "notification"
  | "email_open";

export type MemberEngagementItem = {
  id: string;
  kind: MemberEngagementKind;
  at: Date;
  displayName: string;
  detail: string;
  href?: string | null;
  memberId?: string | null;
  userId?: string | null;
};

/** Officers who can see engagement of members on the club dashboard. */
export function canViewMemberEngagement(
  role: string,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;
  return (
    role === "PRESIDENT" ||
    role === "VICE_PRESIDENT" ||
    role === "ADMIN" ||
    role === "SECRETARY" ||
    role === "MEMBERSHIP_CHAIR"
  );
}

function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null
): string {
  const name = formatPersonName(firstName, lastName);
  if (name) return name;
  return email?.trim() || "—";
}

/**
 * Recent member engagement for the club dashboard:
 * - last platform logins of club users
 * - recent PV openings
 * - notifications sent to club members
 * - email campaign opens
 */
export async function getRecentMemberEngagement(
  clubId: string,
  limit = 12
): Promise<MemberEngagementItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const take = Math.min(Math.max(limit * 2, 20), 40);

  const memberships = await prisma.clubMembership.findMany({
    where: {
      clubId,
      isActive: true,
      approvalStatus: "APPROVED",
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lastLoginAt: true,
          memberProfile: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const userIds = memberships.map((m) => m.userId);
  const emails = memberships
    .map((m) => m.user.email?.trim().toLowerCase())
    .filter((e): e is string => !!e);

  const [minuteViews, notifications, emailOpens] = await Promise.all([
    userIds.length
      ? prisma.minuteView.findMany({
          where: { clubId, viewedAt: { gte: since } },
          orderBy: { viewedAt: "desc" },
          take,
          include: {
            minute: { select: { id: true, title: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                memberProfile: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.notification.findMany({
          where: {
            clubId,
            userId: { in: userIds },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                memberProfile: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    emails.length
      ? prisma.emailLog.findMany({
          where: {
            openedAt: { gte: since, not: null },
            campaign: { clubId },
            OR: emails.map((email) => ({
              recipient: { equals: email, mode: "insensitive" as const },
            })),
          },
          orderBy: { openedAt: "desc" },
          take,
          include: {
            campaign: { select: { id: true, name: true, subject: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const items: MemberEngagementItem[] = [];

  for (const m of memberships) {
    const loginAt = m.user.lastLoginAt;
    if (!loginAt || loginAt < since) continue;
    const profile = m.user.memberProfile;
    items.push({
      id: `login-${m.userId}-${loginAt.getTime()}`,
      kind: "login",
      at: loginAt,
      displayName: profile
        ? displayName(profile.firstName, profile.lastName, m.user.email)
        : displayName(m.user.firstName, m.user.lastName, m.user.email),
      detail: "",
      memberId: profile?.id ?? null,
      userId: m.userId,
    });
  }

  for (const view of minuteViews) {
    const profile = view.user.memberProfile;
    items.push({
      id: `minute-${view.id}`,
      kind: "minute_read",
      at: view.viewedAt,
      displayName: profile
        ? displayName(profile.firstName, profile.lastName, view.user.email)
        : displayName(view.user.firstName, view.user.lastName, view.user.email),
      detail: view.minute.title,
      href: `/minutes/${view.minute.id}`,
      memberId: profile?.id ?? null,
      userId: view.userId,
    });
  }

  for (const n of notifications) {
    const profile = n.user.memberProfile;
    items.push({
      id: `notif-${n.id}`,
      kind: "notification",
      at: n.createdAt,
      displayName: profile
        ? displayName(profile.firstName, profile.lastName, n.user.email)
        : displayName(n.user.firstName, n.user.lastName, n.user.email),
      detail: n.title,
      href: n.link,
      memberId: profile?.id ?? null,
      userId: n.userId,
    });
  }

  const emailToUser = new Map(
    memberships
      .filter((m) => m.user.email)
      .map((m) => [m.user.email!.trim().toLowerCase(), m.user] as const)
  );

  for (const log of emailOpens) {
    if (!log.openedAt) continue;
    const user = emailToUser.get(log.recipient.trim().toLowerCase());
    const profile = user?.memberProfile;
    items.push({
      id: `email-${log.id}`,
      kind: "email_open",
      at: log.openedAt,
      displayName: user
        ? profile
          ? displayName(profile.firstName, profile.lastName, user.email)
          : displayName(user.firstName, user.lastName, user.email)
        : log.recipient,
      detail: log.campaign.subject || log.campaign.name,
      memberId: profile?.id ?? null,
      userId: user?.id ?? null,
    });
  }

  // Deduplicate same person+kind within a short window is not needed; sort by time.
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}
