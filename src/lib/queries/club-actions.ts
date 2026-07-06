import { prisma } from "@/lib/prisma";
import type { ClubActionStatus } from "@/generated/prisma/client";

export type ActionFilters = {
  status?: ClubActionStatus;
  responsibleMemberId?: string;
  minuteId?: string;
};

export async function getClubActions(clubId: string, filters?: ActionFilters) {
  const where: {
    clubId: string;
    status?: ClubActionStatus;
    responsibleMemberId?: string;
    minuteId?: string;
  } = { clubId };

  if (filters?.status) where.status = filters.status;
  if (filters?.responsibleMemberId) where.responsibleMemberId = filters.responsibleMemberId;
  if (filters?.minuteId) where.minuteId = filters.minuteId;

  return prisma.clubAction.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      responsibleMember: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      minute: { select: { id: true, title: true, meetingId: true } },
      agendaItem: { select: { id: true, title: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
}

export async function getActionMembers(clubId: string) {
  return prisma.member.findMany({
    where: { clubId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });
}

export async function getOverdueActionsForReminders(cooldownCutoff: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return prisma.clubAction.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueDate: { lte: today },
      OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: cooldownCutoff } }],
    },
    include: {
      club: { select: { id: true, name: true, logoUrl: true, language: true } },
      responsibleMember: {
        select: { id: true, firstName: true, lastName: true, email: true, userId: true },
      },
      minute: { select: { id: true, title: true } },
    },
  });
}