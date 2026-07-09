"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { getAppBaseUrl } from "@/lib/app-url";
import { isEmailEnabled } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";
import { buildClubEmailVars, renderEmailContent } from "@/lib/email-render";
import { ensureEmailSystemTemplates, SYSTEM_EMAIL_TEMPLATES } from "@/lib/email-system-templates";
import {
  getActionMembers,
  getClubActions,
  type ActionFilters,
} from "@/lib/queries/club-actions";
import type { ClubActionPriority, ClubActionStatus } from "@/generated/prisma/client";

function revalidateActions() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/actions`);
    revalidatePath(`/${loc}/calendar`);
  }
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

async function requireActionsManage() {
  const feature = await requireFeature("actionsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("actions.manage");
  if (auth.error) return auth;
  return auth;
}

function parseActionLines(text: string): string[] {
  return text
    .split(/\n|;/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export async function listActions(filters?: {
  status?: ClubActionStatus;
  responsibleMemberId?: string;
  minuteId?: string;
}) {
  const auth = await requireActionsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const parsed: ActionFilters = {
    status: filters?.status,
    responsibleMemberId: filters?.responsibleMemberId,
    minuteId: filters?.minuteId,
  };

  const [actions, members] = await Promise.all([
    getClubActions(ctx.clubId, parsed),
    getActionMembers(ctx.clubId),
  ]);

  const canManage = await hasRolePermission(ctx.role, "actions.manage", ctx.isSuperAdmin);

  return {
    canManage,
    members,
    actions: actions.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate?.toISOString() ?? null,
      responsibleMemberId: a.responsibleMemberId,
      responsibleName:
        a.responsibleMember
          ? `${a.responsibleMember.firstName} ${a.responsibleMember.lastName}`
          : a.responsibleName,
      responsibleEmail: a.responsibleMember?.email ?? null,
      minuteId: a.minuteId,
      minuteTitle: a.minute?.title ?? null,
      agendaItemId: a.agendaItemId,
      agendaItemTitle: a.agendaItem?.title ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
      lastRemindedAt: a.lastRemindedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function createAction(data: {
  title: string;
  description?: string;
  responsibleMemberId?: string;
  responsibleName?: string;
  dueDate?: string;
  priority?: ClubActionPriority;
  minuteId?: string;
}) {
  const auth = await requireActionsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const action = await prisma.clubAction.create({
    data: {
      clubId: ctx.clubId,
      title: data.title,
      description: data.description || null,
      responsibleMemberId: data.responsibleMemberId || null,
      responsibleName: data.responsibleName || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority ?? "NORMAL",
      minuteId: data.minuteId || null,
      createdById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_ACTION_CREATED",
      entity: "ClubAction",
      entityId: action.id,
    },
  });

  revalidateActions();
  return { success: true, action };
}

export async function updateActionStatus(actionId: string, status: ClubActionStatus) {
  const auth = await requireActionsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubAction.findFirst({
    where: { id: actionId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubAction.update({
    where: { id: actionId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  if (status === "COMPLETED") {
    const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
    void dispatchClubWebhook(ctx.clubId, "ACTION_COMPLETED", {
      actionId,
      title: existing.title,
      completedAt: new Date().toISOString(),
    });
  }

  revalidateActions();
  return { success: true };
}

export async function listPendingAgendaActions(minuteId: string) {
  const auth = await requireActionsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: { agendaItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!minute) return { error: "NOT_FOUND" as const };

  const members = await getActionMembers(ctx.clubId);
  const pending = minute.agendaItems
    .filter((item) => item.actions?.trim())
    .map((item) => {
      const lines = parseActionLines(item.actions!);
      const titles = lines.length > 0 ? lines : [item.actions!.trim()];
      return {
        agendaItemId: item.id,
        agendaTitle: item.title,
        titles,
        responsible: item.responsible,
        dueDate: item.dueDate?.toISOString() ?? null,
        alreadySynced: false as boolean,
      };
    });

  for (const p of pending) {
    const existing = await prisma.clubAction.findFirst({
      where: { agendaItemId: p.agendaItemId },
    });
    p.alreadySynced = !!existing;
  }

  return { pending, members, canManage: await hasRolePermission(ctx.role, "actions.manage", ctx.isSuperAdmin) };
}

export async function assignAgendaActions(
  minuteId: string,
  assignments: Array<{ agendaItemId: string; responsibleMemberId?: string; title?: string }>
) {
  const auth = await requireActionsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  let created = 0;
  for (const a of assignments) {
    const item = await prisma.agendaItem.findFirst({
      where: { id: a.agendaItemId, minuteId, minute: { clubId: ctx.clubId } },
    });
    if (!item?.actions?.trim()) continue;

    const existing = await prisma.clubAction.findFirst({ where: { agendaItemId: item.id } });
    if (existing) {
      if (a.responsibleMemberId) {
        await prisma.clubAction.update({
          where: { id: existing.id },
          data: { responsibleMemberId: a.responsibleMemberId },
        });
      }
      continue;
    }

    const title = a.title?.trim() || parseActionLines(item.actions)[0] || item.actions.trim();
    await prisma.clubAction.create({
      data: {
        clubId: ctx.clubId,
        title,
        description: item.decisions || item.description || null,
        responsibleMemberId: a.responsibleMemberId || null,
        responsibleName: item.responsible || null,
        dueDate: item.dueDate,
        minuteId,
        agendaItemId: item.id,
        status: "OPEN",
        priority: "NORMAL",
        createdById: ctx.userId,
      },
    });
    created++;
  }

  revalidateActions();
  return { success: true as const, created };
}

/** Import actions from finalized minute agenda items. */
export async function syncFromAgendaItems(minuteId: string, clubId?: string) {
  const minute = await prisma.minute.findFirst({
    where: clubId ? { id: minuteId, clubId } : { id: minuteId },
    include: { agendaItems: true },
  });
  if (!minute) return { error: "NOT_FOUND" as const };

  const features = await prisma.clubFeatures.findUnique({
    where: { clubId: minute.clubId },
  });
  if (!features?.actionsEnabled) return { skipped: true };

  let created = 0;
  for (const item of minute.agendaItems) {
    if (!item.actions?.trim()) continue;

    const existing = await prisma.clubAction.findFirst({
      where: { agendaItemId: item.id },
    });
    if (existing) continue;

    const lines = parseActionLines(item.actions);
    const titles = lines.length > 0 ? lines : [item.actions.trim()];

    for (const title of titles) {
      await prisma.clubAction.create({
        data: {
          clubId: minute.clubId,
          title,
          description: item.decisions || item.description || null,
          responsibleName: item.responsible || null,
          dueDate: item.dueDate,
          minuteId: minute.id,
          agendaItemId: item.id,
          status: "OPEN",
          priority: "NORMAL",
        },
      });
      created++;
    }
  }

  if (created > 0) revalidateActions();
  return { success: true, created };
}

export async function sendActionReminder(actionId: string, locale = "fr") {
  const auth = await requireActionsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const action = await prisma.clubAction.findFirst({
    where: { id: actionId, clubId: ctx.clubId },
    include: {
      responsibleMember: true,
      club: { select: { name: true, logoUrl: true, language: true } },
    },
  });
  if (!action) return { error: "NOT_FOUND" as const };

  const loc = locale || (action.club.language === "EN" ? "en" : "fr");
  const dateLocale = loc === "fr" ? fr : enUS;
  const recipientEmail = action.responsibleMember?.email;
  const recipientUserId = action.responsibleMember?.userId;

  const responsible =
    action.responsibleMember
      ? `${action.responsibleMember.firstName} ${action.responsibleMember.lastName}`
      : action.responsibleName ?? (loc === "fr" ? "Non assigné" : "Unassigned");

  const dueStr = action.dueDate
    ? format(action.dueDate, "d MMMM yyyy", { locale: dateLocale })
    : loc === "fr"
      ? "Non définie"
      : "Not set";

  const link = `/${loc}/actions`;
  const title =
    loc === "fr" ? `Rappel — ${action.title}` : `Reminder — ${action.title}`;
  const message =
    loc === "fr"
      ? `Échéance : ${dueStr} · Responsable : ${responsible}`
      : `Due: ${dueStr} · Owner: ${responsible}`;

  if (recipientUserId) {
    await prisma.notification.create({
      data: {
        userId: recipientUserId,
        clubId: ctx.clubId,
        type: "ACTION_REMINDER",
        title,
        message,
        link,
      },
    });
  }

  let emailed = false;
  if (recipientEmail && (await isEmailEnabled())) {
    await ensureEmailSystemTemplates();
    const baseUrl = getAppBaseUrl();
    const emailLogo = resolveLogoForEmail(ctx.clubId, action.club.logoUrl, baseUrl);
    const dbTpl = await prisma.emailTemplate.findFirst({
      where: { slug: `action-deadline-reminder-${loc}`, clubId: null, isSystem: true },
    });
    const systemTpl = SYSTEM_EMAIL_TEMPLATES.find((t) => t.slug === "action-deadline-reminder");
    const lang = loc === "en" ? "en" : "fr";
    const subjectTpl = dbTpl?.subject ?? systemTpl?.subject[lang];
    const bodyTpl = dbTpl?.body ?? systemTpl?.body[lang];

    if (subjectTpl && bodyTpl) {
      const vars = buildClubEmailVars({
        clubName: action.club.name,
        locale: loc,
        clubLogo: logoSrcFromResult(emailLogo) ?? "",
        firstName: action.responsibleMember?.firstName,
        lastName: action.responsibleMember?.lastName,
        actionTitle: action.title,
        actionDueDate: dueStr,
        actionResponsible: responsible,
        dashboardUrl: `${baseUrl}/${loc}/actions`,
      });
      const branded = prepareBrandedEmail(renderEmailContent(bodyTpl, vars), {
        clubName: action.club.name,
        logo: emailLogo,
      });
      const result = await sendClubEmail(ctx.clubId, {
        to: recipientEmail,
        subject: renderEmailContent(subjectTpl, vars),
        html: branded.html,
        attachments: branded.attachments,
      });
      emailed = result.ok;
    }
  }

  await prisma.clubAction.update({
    where: { id: actionId },
    data: { lastRemindedAt: new Date() },
  });

  revalidateActions();
  return {
    success: true,
    emailed,
    message: emailed
      ? loc === "fr"
        ? `Rappel envoyé à ${recipientEmail}`
        : `Reminder sent to ${recipientEmail}`
      : loc === "fr"
        ? "Notification créée"
        : "Notification created",
  };
}

export async function exportActions() {
  const auth = await requireActionsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const actions = await getClubActions(ctx.clubId);
  const header = "Title,Status,Priority,Responsible,Due Date,Minute,Description\n";
  const rows = actions.map((a) => {
    const responsible = a.responsibleMember
      ? `${a.responsibleMember.firstName} ${a.responsibleMember.lastName}`
      : a.responsibleName ?? "";
    const cols = [
      `"${a.title.replace(/"/g, '""')}"`,
      a.status,
      a.priority,
      `"${responsible.replace(/"/g, '""')}"`,
      a.dueDate?.toISOString().slice(0, 10) ?? "",
      a.minute?.title ?? "",
      `"${(a.description ?? "").replace(/"/g, '""')}"`,
    ];
    return cols.join(",");
  });

  return { success: true, csv: header + rows.join("\n") };
}