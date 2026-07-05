import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { ClubRole, NotificationType } from "@/generated/prisma/client";

export const getUserNotifications = cache(async (userId: string) => {
  const items = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const unreadCount =
    items.length < 8
      ? items.length
      : await prisma.notification.count({ where: { userId, isRead: false } });

  return { items, unreadCount };
});

export async function getAllUserNotifications(
  userId: string,
  options?: { type?: NotificationType; excludeAnnouncement?: boolean }
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.excludeAnnouncement ? { type: { not: "ANNOUNCEMENT" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getUserAnnouncements(params: {
  userId: string;
  clubId?: string;
  role?: ClubRole;
  isSuperAdmin?: boolean;
}) {
  if (params.isSuperAdmin) {
    return prisma.announcement.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 100,
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });
  }

  return prisma.announcement.findMany({
    where: {
      sentAt: { not: null },
      OR: [
        { targetType: "ALL_CLUBS" },
        ...(params.clubId
          ? [{ targetType: "CLUB" as const, targetClubIds: { has: params.clubId } }]
          : []),
        { targetType: "USERS", targetUserIds: { has: params.userId } },
        ...(params.role
          ? [{ targetType: "ROLE" as const, targetRoles: { has: params.role } }]
          : []),
      ],
    },
    orderBy: { sentAt: "desc" },
    take: 100,
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
  });
}