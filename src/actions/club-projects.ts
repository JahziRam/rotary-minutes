"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import {
  getClubProjectById,
  getClubProjects,
  getProjectCommissions,
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
  commissionId?: string | null;
  completedAt: Date | null;
  createdAt: Date;
  minuteId: string | null;
  responsibleMember: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  commission?: { id: string; name: string } | null;
  assignees?: Array<{
    member: { id: string; firstName: string; lastName: string; email: string | null };
  }>;
  minute: { id: string; title: string } | null;
}) {
  const assignees = (t.assignees ?? []).map((x) => ({
    id: x.member.id,
    firstName: x.member.firstName,
    lastName: x.member.lastName,
    email: x.member.email,
  }));
  const names = assignees.map((m) => `${m.firstName} ${m.lastName}`);
  const primary = t.responsibleMember
    ? `${t.responsibleMember.firstName} ${t.responsibleMember.lastName}`
    : t.responsibleName;
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    responsibleMemberId: t.responsibleMemberId,
    responsibleName: primary,
    responsibleEmail: t.responsibleMember?.email ?? null,
    assigneeIds: assignees.map((m) => m.id),
    assignees,
    commissionId: t.commissionId ?? t.commission?.id ?? null,
    commissionName: t.commission?.name ?? null,
    assigneeLabel:
      [t.commission?.name, names.length ? names.join(", ") : primary]
        .filter(Boolean)
        .join(" · ") || null,
    minuteId: t.minuteId,
    minuteTitle: t.minute?.title ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

async function syncProjectAssignees(
  projectId: string,
  memberIds: string[],
  clubId: string
) {
  const unique = [...new Set(memberIds.filter(Boolean))];
  const valid =
    unique.length > 0
      ? await prisma.member.findMany({
          where: { clubId, id: { in: unique }, isActive: true },
          select: { id: true },
        })
      : [];
  const ids = valid.map((m) => m.id);
  await prisma.clubProjectAssignee.deleteMany({ where: { projectId } });
  if (ids.length > 0) {
    await prisma.clubProjectAssignee.createMany({
      data: ids.map((memberId) => ({ projectId, memberId })),
    });
  }
  return ids;
}

export async function listProjects(filters?: { status?: ClubProjectStatus }) {
  const auth = await requireProjectsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const [projects, members, commissions] = await Promise.all([
    getClubProjects(ctx.clubId, filters),
    getProjectMembers(ctx.clubId),
    getProjectCommissions(ctx.clubId),
  ]);

  const canManage = await hasRolePermission(
    ctx.role,
    "projects.manage",
    ctx.isSuperAdmin
  );

  return {
    canManage,
    members,
    commissions,
    projects: projects.map((p) => {
      const openTasks = p.tasks.filter(
        (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
      ).length;
      const doneTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
      const assignees = p.assignees.map((x) => ({
        id: x.member.id,
        firstName: x.member.firstName,
        lastName: x.member.lastName,
      }));
      const names = assignees.map((m) => `${m.firstName} ${m.lastName}`);
      const ownerName = p.ownerMember
        ? `${p.ownerMember.firstName} ${p.ownerMember.lastName}`
        : null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        color: p.color,
        ownerMemberId: p.ownerMemberId,
        ownerName,
        assigneeIds: assignees.map((m) => m.id),
        assignees,
        commissionId: p.commissionId,
        commissionName: p.commission?.name ?? null,
        assigneeLabel:
          [p.commission?.name, names.length ? names.join(", ") : ownerName]
            .filter(Boolean)
            .join(" · ") || null,
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

  const [members, commissions, canManage, entries, documents, club] = await Promise.all([
    getProjectMembers(ctx.clubId),
    getProjectCommissions(ctx.clubId),
    hasRolePermission(ctx.role, "projects.manage", ctx.isSuperAdmin),
    prisma.budgetEntry.findMany({
      where: { clubId: ctx.clubId, projectId },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        date: true,
        description: true,
      },
    }),
    prisma.budgetDocument.findMany({
      where: { clubId: ctx.clubId, projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: { currency: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.type === "INCOME") income += amt;
    else expense += amt;
  }
  const planned =
    project.budgetPlanned != null ? Number(project.budgetPlanned) : null;
  const actual = income - expense;

  const { budgetDocumentDownloadUrl, budgetDocumentViewUrl } = await import(
    "@/lib/budget-document-urls"
  );

  const projectAssignees = project.assignees.map((x) => ({
    id: x.member.id,
    firstName: x.member.firstName,
    lastName: x.member.lastName,
    email: x.member.email,
  }));
  const projectNames = projectAssignees.map(
    (m) => `${m.firstName} ${m.lastName}`
  );
  const ownerName = project.ownerMember
    ? `${project.ownerMember.firstName} ${project.ownerMember.lastName}`
    : null;

  return {
    canManage,
    members,
    commissions,
    currency: club?.currency ?? "EUR",
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      color: project.color,
      ownerMemberId: project.ownerMemberId,
      ownerName,
      assigneeIds: projectAssignees.map((m) => m.id),
      assignees: projectAssignees,
      commissionId: project.commissionId,
      commissionName: project.commission?.name ?? null,
      assigneeLabel:
        [
          project.commission?.name,
          projectNames.length ? projectNames.join(", ") : ownerName,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      budgetPlanned: planned,
      budgetNotes: project.budgetNotes,
      budget: {
        planned,
        income,
        expense,
        actual,
        variance: planned != null ? actual - planned : null,
      },
      budgetEntries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        currency: e.currency,
        date: e.date.toISOString(),
        description: e.description,
      })),
      budgetDocuments: documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        label: d.label,
        fileName: d.fileName,
        mimeType: d.mimeType,
        amount: d.amount != null ? Number(d.amount) : null,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
        viewUrl: budgetDocumentViewUrl(d.id, d.mimeType),
        downloadUrl: budgetDocumentDownloadUrl(d.id),
      })),
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
  assigneeMemberIds?: string[];
  commissionId?: string;
  color?: string;
}) {
  const auth = await requireProjectsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const name = data.name.trim();
  if (!name) return { error: "INVALID" as const };

  if (data.commissionId) {
    const commission = await prisma.commission.findFirst({
      where: { id: data.commissionId, clubId: ctx.clubId, isActive: true },
      select: { id: true },
    });
    if (!commission) return { error: "NOT_FOUND" as const };
  }

  const assigneeIds = [
    ...new Set(
      [...(data.assigneeMemberIds ?? []), data.ownerMemberId].filter(
        (x): x is string => Boolean(x)
      )
    ),
  ];

  const project = await prisma.clubProject.create({
    data: {
      clubId: ctx.clubId,
      name,
      description: data.description?.trim() || null,
      status: data.status ?? "PLANNING",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      ownerMemberId: assigneeIds[0] || data.ownerMemberId || null,
      commissionId: data.commissionId || null,
      color: data.color?.trim() || null,
      createdById: ctx.userId,
    },
  });

  await syncProjectAssignees(project.id, assigneeIds, ctx.clubId);

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
    assigneeMemberIds?: string[];
    commissionId?: string | null;
    color?: string | null;
    budgetPlanned?: number | null;
    budgetNotes?: string | null;
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

  if (data.commissionId) {
    const commission = await prisma.commission.findFirst({
      where: { id: data.commissionId, clubId: ctx.clubId, isActive: true },
      select: { id: true },
    });
    if (!commission) return { error: "NOT_FOUND" as const };
  }

  let ownerId = data.ownerMemberId;
  if (data.assigneeMemberIds) {
    const ids = await syncProjectAssignees(
      projectId,
      data.assigneeMemberIds,
      ctx.clubId
    );
    ownerId = ids[0] ?? null;
  }

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
      ...(ownerId !== undefined && { ownerMemberId: ownerId || null }),
      ...(data.commissionId !== undefined && {
        commissionId: data.commissionId || null,
      }),
      ...(data.color !== undefined && { color: data.color?.trim() || null }),
      ...(data.budgetPlanned !== undefined && {
        budgetPlanned:
          data.budgetPlanned == null || !Number.isFinite(data.budgetPlanned)
            ? null
            : data.budgetPlanned,
      }),
      ...(data.budgetNotes !== undefined && {
        budgetNotes: data.budgetNotes?.trim() || null,
      }),
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

export async function updateProjectBudget(
  projectId: string,
  data: { budgetPlanned?: number | null; budgetNotes?: string | null }
) {
  return updateProject(projectId, data);
}

export async function createProjectBudgetEntry(
  projectId: string,
  data: {
    type: "INCOME" | "EXPENSE";
    amount: number;
    date: string;
    description: string;
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

  if (!data.description.trim() || !Number.isFinite(data.amount) || data.amount <= 0) {
    return { error: "INVALID" as const };
  }

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true },
  });

  const entry = await prisma.budgetEntry.create({
    data: {
      clubId: ctx.clubId,
      projectId,
      type: data.type,
      amount: data.amount,
      currency: club?.currency ?? "EUR",
      date: new Date(data.date),
      description: data.description.trim(),
      recordedById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "PROJECT_BUDGET_ENTRY_CREATED",
      entity: "BudgetEntry",
      entityId: entry.id,
      metadata: { projectId, type: data.type, amount: data.amount },
    },
  });

  revalidateProjects(projectId);
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/treasury`);
  }
  return { success: true as const, entryId: entry.id };
}

export async function createProjectTask(
  projectId: string,
  data: {
    title: string;
    description?: string;
    responsibleMemberId?: string;
    responsibleName?: string;
    assigneeMemberIds?: string[];
    commissionId?: string;
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

  if (data.commissionId) {
    const commission = await prisma.commission.findFirst({
      where: { id: data.commissionId, clubId: ctx.clubId, isActive: true },
      select: { id: true },
    });
    if (!commission) return { error: "NOT_FOUND" as const };
  }

  const title = data.title.trim();
  if (!title) return { error: "INVALID" as const };

  const assigneeIds = [
    ...new Set(
      [...(data.assigneeMemberIds ?? []), data.responsibleMemberId].filter(
        (x): x is string => Boolean(x)
      )
    ),
  ];

  const task = await prisma.clubAction.create({
    data: {
      clubId: ctx.clubId,
      projectId,
      title,
      description: data.description?.trim() || null,
      responsibleMemberId: assigneeIds[0] || data.responsibleMemberId || null,
      responsibleName: data.responsibleName || null,
      commissionId: data.commissionId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority ?? "NORMAL",
      createdById: ctx.userId,
    },
  });

  if (assigneeIds.length > 0) {
    const valid = await prisma.member.findMany({
      where: { clubId: ctx.clubId, id: { in: assigneeIds }, isActive: true },
      select: { id: true },
    });
    if (valid.length > 0) {
      await prisma.clubActionAssignee.createMany({
        data: valid.map((m) => ({ actionId: task.id, memberId: m.id })),
      });
    }
  }

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
