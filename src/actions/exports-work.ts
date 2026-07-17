"use server";

import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { hasRolePermission } from "@/lib/roles";
import { formatBudgetMoney } from "@/lib/budget-utils";

async function requireProjectsView() {
  const feature = await requireFeature("projectsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "projects.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireActionsView() {
  const feature = await requireFeature("actionsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "actions.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

export async function exportProjectsCsv() {
  const auth = await requireProjectsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const projects = await prisma.clubProject.findMany({
    where: { clubId: ctx.clubId },
    orderBy: { name: "asc" },
    include: {
      commission: { select: { name: true } },
      assignees: {
        include: { member: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });

  const header =
    "Name,Status,Owner,Assignees,Commission,BudgetPlanned,Tasks,Start,End\n";
  const rows = projects.map((p) => {
    const assignees = p.assignees
      .map((a) => `${a.member.firstName} ${a.member.lastName}`)
      .join("; ");
    const owner = p.assignees[0]
      ? `${p.assignees[0].member.firstName} ${p.assignees[0].member.lastName}`
      : "";
    return [
      `"${p.name.replace(/"/g, '""')}"`,
      p.status,
      `"${owner}"`,
      `"${assignees.replace(/"/g, '""')}"`,
      `"${(p.commission?.name ?? "").replace(/"/g, '""')}"`,
      p.budgetPlanned != null ? Number(p.budgetPlanned) : "",
      p._count.tasks,
      p.startDate?.toISOString().slice(0, 10) ?? "",
      p.endDate?.toISOString().slice(0, 10) ?? "",
    ].join(",");
  });

  return {
    success: true as const,
    csv: header + rows.join("\n"),
    filename: "projects.csv",
  };
}

export async function exportActionsCsv() {
  const auth = await requireActionsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const actions = await prisma.clubAction.findMany({
    where: { clubId: ctx.clubId },
    orderBy: { createdAt: "desc" },
    include: {
      commission: { select: { name: true } },
      project: { select: { name: true } },
      assignees: {
        include: { member: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const header =
    "Title,Status,Priority,Assignees,Commission,Project,DueDate\n";
  const rows = actions.map((a) => {
    const assignees = a.assignees
      .map((x) => `${x.member.firstName} ${x.member.lastName}`)
      .join("; ");
    return [
      `"${a.title.replace(/"/g, '""')}"`,
      a.status,
      a.priority,
      `"${assignees.replace(/"/g, '""')}"`,
      `"${(a.commission?.name ?? "").replace(/"/g, '""')}"`,
      `"${(a.project?.name ?? "").replace(/"/g, '""')}"`,
      a.dueDate?.toISOString().slice(0, 10) ?? "",
    ].join(",");
  });

  return {
    success: true as const,
    csv: header + rows.join("\n"),
    filename: "actions.csv",
  };
}

export async function exportProjectBudgetPdf(projectId: string, locale = "fr") {
  const auth = await requireProjectsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const project = await prisma.clubProject.findFirst({
    where: { id: projectId, clubId: ctx.clubId },
    include: {
      budgetEntries: { orderBy: { date: "desc" } },
      budgetDocuments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return { error: "NOT_FOUND" as const };

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: {
      id: true,
      name: true,
      currency: true,
      address: true,
      meetingLocation: true,
      logoUrl: true,
    },
  });
  if (!club) return { error: "NOT_FOUND" as const };

  let income = 0;
  let expense = 0;
  for (const e of project.budgetEntries) {
    const amt = Number(e.amount);
    if (e.type === "INCOME") income += amt;
    else expense += amt;
  }
  const planned =
    project.budgetPlanned != null ? Number(project.budgetPlanned) : null;
  const actual = income - expense;
  const currency = club.currency || "EUR";

  const lines = [
    `Budget projet — ${project.name}`,
    club.name,
    "",
    `Prévu: ${planned != null ? formatBudgetMoney(planned, currency, locale) : "—"}`,
    `Recettes: ${formatBudgetMoney(income, currency, locale)}`,
    `Dépenses: ${formatBudgetMoney(expense, currency, locale)}`,
    `Réalisé net: ${formatBudgetMoney(actual, currency, locale)}`,
    planned != null
      ? `Écart: ${formatBudgetMoney(actual - planned, currency, locale)}`
      : "",
    "",
    "Opérations:",
    ...project.budgetEntries.map(
      (e) =>
        `${e.date.toISOString().slice(0, 10)} | ${e.type} | ${formatBudgetMoney(Number(e.amount), e.currency, locale)} | ${e.description}`
    ),
    "",
    "Documents:",
    ...project.budgetDocuments.map(
      (d) =>
        `${d.kind} | ${d.label || d.fileName}${d.amount != null ? ` | ${formatBudgetMoney(Number(d.amount), currency, locale)}` : ""}`
    ),
  ].filter(Boolean);

  // Lightweight PDF via existing treasury renderer if available, else text buffer as PDF-like download
  try {
    const { buildTreasuryReportPdfBuffer } = await import(
      "@/lib/pdf/build-treasury-pdf"
    );
    const entries = project.budgetEntries.map((e) => ({
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      date: e.date,
      description: e.description,
      categoryName: null,
      eventTitle: project.name,
    }));
    const pdf = await buildTreasuryReportPdfBuffer(
      club,
      entries,
      { income, expense, balance: actual },
      locale
    );
    return {
      success: true as const,
      pdfBase64: pdf.buffer.toString("base64"),
      filename: pdf.filename.replace("treasury", `project-${project.name.slice(0, 20)}`),
    };
  } catch {
    const text = lines.join("\n");
    return {
      success: true as const,
      pdfBase64: Buffer.from(text, "utf8").toString("base64"),
      filename: `project-budget-${projectId.slice(0, 8)}.txt`,
    };
  }
}
