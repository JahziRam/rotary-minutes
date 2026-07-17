import { prisma } from "@/lib/prisma";
import type { ClubProjectStatus } from "@/generated/prisma/client";

export type ProjectFilters = {
  status?: ClubProjectStatus;
};

export async function getClubProjects(clubId: string, filters?: ProjectFilters) {
  return prisma.clubProject.findMany({
    where: {
      clubId,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      ownerMember: { select: { id: true, firstName: true, lastName: true } },
      _count: {
        select: {
          tasks: true,
        },
      },
      tasks: {
        select: { id: true, status: true },
      },
    },
  });
}

export async function getClubProjectById(clubId: string, projectId: string) {
  return prisma.clubProject.findFirst({
    where: { id: projectId, clubId },
    include: {
      ownerMember: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          responsibleMember: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          minute: { select: { id: true, title: true } },
        },
      },
    },
  });
}

export type ClubProjectDetail = NonNullable<
  Awaited<ReturnType<typeof getClubProjectById>>
>;

export async function getProjectMembers(clubId: string) {
  return prisma.member.findMany({
    where: { clubId, isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
