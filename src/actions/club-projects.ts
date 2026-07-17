"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import {
  getClubProjectById,
  getClubProjects,
  getProjectMembers,
} from "@/lib/queries/club-projects";
import type {
  ClubActionPriority,
  ClubActionStatus,
  ClubProjectStatus,
} from "@/generated/prisma/client";

function revalidateProjects(projectId?: string) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/projects`);
    revalidatePath(`/${loc}/actions`);
    if (projectId) revalidatePath(`/${loc}/projects/${projectId}`);
  }
}

async function requireProjectsView() {
  const feature = await requireFeature("projectsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "projects.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireProjectsManage() {
  const feature = await requireFeature("projectsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("projects.manage");
  if (auth.error) return auth;
  return auth;
}

function serializeTask(t: {
  id: string;
  title: string;
  description: string | null;
  status: ClubActionStatus;
  priority: ClubActionPriority;
  dueDate: Date | null;
  responsibleMemberId: string | null;
  responsibleName: string | null;
  completedAt: Date | null;
  createdAt: Date;
  minuteId: string | null;
  responsibleMember: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  minute: { id: string; title: string } | null;
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    responsibleMemberId: t.responsibleMemberId,
    responsibleName: t.responsibleMember
      ? `${t.responsibleMember.firstName} ${t.responsibleMember.lastName}`
      : t.responsibleName,
    responsibleEmail: t.responsibleMember?.email ?? null,
    minuteId: t.minuteId,
    minuteTitle: t.minute?.title ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function listProjects(filters?: { status?: ClubProjectStatus }) {
  const auth = await requireProjectsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const [projects, members] = await Promise.all([
    getClubProjects(ctx.clubId, filters),
    getProjectMembers(ctx.clubId),
  ]);

  const canManage = await hasRolePermission(
    ctx.role,
    "projects.manage",
    ctx.isSuperAdmin
  );

  return {
    canManage,
    members,
    projects: projects.map((p) => {
      const openTasks = p.tasks.filter(
        (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
      ).length;
      const doneTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        color: p.color,
        ownerMemberId: p.ownerMemberId,
        ownerName: p.ownerMember
          ? `${p.ownerMember.firstName} ${p.ownerMember.lastName}`
          : null,
        taskCount: p._count.tasks,
        openTaskCount: openTasks,
        completedTaskCount: doneTasks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    }),
  };
}

export async function getProject(projectId: string) {
  const auth = await requireProjectsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const project = await getClubProjectById(ctx.clubId, projectId);
  if (!project) return { error: "NOT_FOUND" as const };

  const [members, canManage] = await Promise.all([
    getProjectMembers(ctx.clubId),
    hasRolePermission(ctx.role, "projects.manage", ctx.isSuperAdmin),
  ]);

  return {
    canManage,
    members,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      color: project.color,
      ownerMemberId: project.ownerMemberId,
      ownerName: project.ownerMember
        ? `${project.ownerMember.firstName} ${project.ownerMember.lastName}`
        : null,
      tasks: project.tasks.map(serializeTask),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
  };
}

export async function createProject(data: {
  name: string;
  description?: string;
  status?: ClubProjectStatus;
  startDate?: string;
  endDate?: string;
  ownerMemberId?: string;
  color?: string;
}) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const name = data.name.trim();
  if (!name) return { error: "INVALID" as const };

  const project = await prisma.clubProject.create({
    data: {
      clubId: ctx.clubId,
      name,
      description: data.description?.trim() || null,
      status: data.status ?? "PLANNING",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      ownerMemberId: data.ownerMemberId || null,
      color: data.color?.trim() || null,
      createdById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_PROJECT_CREATED",
      entity: "ClubProject",
      entityId: project.id,
    },
  });

  revalidateProjects(project.id);
  return { success: true as const, projectId: project.id };
}

export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    status?: ClubProjectStatus;
    startDate?: string | null;
    endDate?: string | null;
    ownerMemberId?: string | null;
    color?: string | null;
  }
) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubProject.findFirst({
    where: { id: projectId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubProject.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && {
        description: data.description.trim() || null,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.startDate !== undefined && {
        startDate: data.startDate ? new Date(data.startDate) : null,
      }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.ownerMemberId !== undefined && {
        ownerMemberId: data.ownerMemberId || null,
      }),
      ...(data.color !== undefined && { color: data.color?.trim() || null }),
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_PROJECT_UPDATED",
      entity: "ClubProject",
      entityId: projectId,
    },
  });

  revalidateProjects(projectId);
  return { success: true as const };
}

export async function deleteProject(projectId: string) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubProject.findFirst({
    where: { id: projectId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubAction.updateMany({
    where: { clubId: ctx.clubId, projectId },
    data: { projectId: null },
  });

  await prisma.clubProject.delete({ where: { id: projectId } });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_PROJECT_DELETED",
      entity: "ClubProject",
      entityId: projectId,
    },
  });

  revalidateProjects();
  return { success: true as const };
}

export async function createProjectTask(
  projectId: string,
  data: {
    title: string;
    description?: string;
    responsibleMemberId?: string;
    responsibleName?: string;
    dueDate?: string;
    priority?: ClubActionPriority;
  }
) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const project = await prisma.clubProject.findFirst({
    where: { id: projectId, clubId: ctx.clubId },
    select: { id: true },
  });
  if (!project) return { error: "NOT_FOUND" as const };

  const title = data.title.trim();
  if (!title) return { error: "INVALID" as const };

  const task = await prisma.clubAction.create({
    data: {
      clubId: ctx.clubId,
      projectId,
      title,
      description: data.description?.trim() || null,
      responsibleMemberId: data.responsibleMemberId || null,
      responsibleName: data.responsibleName || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority ?? "NORMAL",
      createdById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_PROJECT_TASK_CREATED",
      entity: "ClubAction",
      entityId: task.id,
      metadata: { projectId },
    },
  });

  revalidateProjects(projectId);
  return { success: true as const, taskId: task.id };
}

export async function updateProjectTaskStatus(
  projectId: string,
  taskId: string,
  status: ClubActionStatus
) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const task = await prisma.clubAction.findFirst({
    where: { id: taskId, clubId: ctx.clubId, projectId },
    select: { id: true },
  });
  if (!task) return { error: "NOT_FOUND" as const };

  await prisma.clubAction.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidateProjects(projectId);
  return { success: true as const };
}
