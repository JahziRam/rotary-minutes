"use server";

import { revalidatePath } from "next/cache";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { getUnifiedCalendarEvents } from "@/lib/queries/calendar";
import { generateUnifiedCalendarIcs } from "@/lib/ics";
import type { CalendarEventSource } from "@/generated/prisma/client";

function revalidateCalendar() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/calendar`);
  }
}

async function requireCalendarView() {
  const feature = await requireFeature("calendarEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "calendar.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireCalendarManage() {
  const feature = await requireFeature("calendarEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("actions.manage");
  if (auth.error) return auth;
  return auth;
}

export async function getCalendarData(month?: string) {
  const auth = await requireCalendarView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const base = month ? new Date(month) : new Date();
  const from = startOfMonth(base);
  const to = endOfMonth(base);

  const events = await getUnifiedCalendarEvents(ctx.clubId, { from, to });
  const canManage = await hasRolePermission(ctx.role, "actions.manage", ctx.isSuperAdmin);

  return {
    canManage,
    month: from.toISOString(),
    prevMonth: subMonths(from, 1).toISOString(),
    nextMonth: addMonths(from, 1).toISOString(),
    events: events.map((e) => ({
      id: e.id,
      source: e.source,
      title: e.title,
      description: e.description,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      color: e.color,
      link: e.link,
    })),
  };
}

export async function createCalendarNote(data: {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  color?: string;
  source?: CalendarEventSource;
}) {
  const auth = await requireCalendarManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const note = await prisma.clubCalendarNote.create({
    data: {
      clubId: ctx.clubId,
      title: data.title,
      description: data.description || null,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      color: data.color || null,
      source: data.source ?? "CUSTOM",
    },
  });

  revalidateCalendar();
  return { success: true, note };
}

export async function deleteCalendarNote(noteId: string) {
  const auth = await requireCalendarManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubCalendarNote.findFirst({
    where: { id: noteId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubCalendarNote.delete({ where: { id: noteId } });
  revalidateCalendar();
  return { success: true };
}

export async function exportCalendarIcs(month?: string) {
  const auth = await requireCalendarView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const base = month ? new Date(month) : new Date();
  const from = startOfMonth(base);
  const to = endOfMonth(addMonths(from, 2));

  const events = await getUnifiedCalendarEvents(ctx.clubId, { from, to });
  const { getAppName } = await import("@/lib/app-settings");
  const appName = await getAppName();
  const ics = generateUnifiedCalendarIcs(events, ctx.club.name, appName);
  const slug = ctx.club.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return { success: true, ics, filename: `calendrier-${slug}.ics` };
}