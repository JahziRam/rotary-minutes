"use server";

import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import {
  CLUB_ACTIVITY_ACTIONS,
  canViewClubActivity,
} from "@/lib/club-activity-log";

export async function getClubActivityLog(limit = 50) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };
  if (!canViewClubActivity(ctx.role, ctx.isSuperAdmin)) {
    return { error: "FORBIDDEN" as const };
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      clubId: ctx.clubId,
      action: { in: [...CLUB_ACTIVITY_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      actorName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
        : null,
    })),
  };
}