import {
  startOfMonth,
  endOfMonth,
  setYear,
  setMonth,
  setDate,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import type { CalendarEventSource } from "@/generated/prisma/client";

export type UnifiedCalendarEvent = {
  id: string;
  source: CalendarEventSource;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  color?: string | null;
  link?: string | null;
};

const SOURCE_COLORS: Record<CalendarEventSource, string> = {
  MEETING: "#0d2d52",
  EVENT: "#2563eb",
  DUES: "#d97706",
  ACTION: "#dc2626",
  BIRTHDAY: "#ec4899",
  CUSTOM: "#64748b",
};

export function getEventColor(source: CalendarEventSource, custom?: string | null): string {
  return custom ?? SOURCE_COLORS[source];
}

export async function getUnifiedCalendarEvents(
  clubId: string,
  range?: { from: Date; to: Date }
): Promise<UnifiedCalendarEvent[]> {
  const from = range?.from ?? startOfMonth(new Date());
  const to = range?.to ?? endOfMonth(new Date());
  const events: UnifiedCalendarEvent[] = [];

  const [meetings, clubEvents, dues, actions, members, notes] = await Promise.all([
    prisma.meeting.findMany({
      where: { clubId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.clubEvent.findMany({
      where: {
        clubId,
        status: { in: ["PUBLISHED", "COMPLETED"] },
        startAt: { lte: to },
        OR: [{ endAt: { gte: from } }, { endAt: null, startAt: { gte: from } }],
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        location: true,
      },
    }),
    prisma.memberDues.findMany({
      where: {
        clubId,
        dueDate: { gte: from, lte: to },
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: { member: { select: { firstName: true, lastName: true } } },
    }),
    prisma.clubAction.findMany({
      where: {
        clubId,
        dueDate: { gte: from, lte: to },
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        responsibleName: true,
        minuteId: true,
      },
    }),
    prisma.member.findMany({
      where: { clubId, isActive: true, birthday: { not: null } },
      select: { id: true, firstName: true, lastName: true, birthday: true },
    }),
    prisma.clubCalendarNote.findMany({
      where: {
        clubId,
        startAt: { lte: to },
        OR: [{ endAt: { gte: from } }, { endAt: null, startAt: { gte: from } }],
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  for (const m of meetings) {
    events.push({
      id: `meeting-${m.id}`,
      source: "MEETING",
      title: m.title ?? "Réunion",
      description: m.location,
      startAt: m.date,
      endAt: null,
      color: SOURCE_COLORS.MEETING,
      link: `/meetings/${m.id}/attendance`,
    });
  }

  for (const e of clubEvents) {
    events.push({
      id: `event-${e.id}`,
      source: "EVENT",
      title: e.title,
      description: e.description ?? e.location,
      startAt: e.startAt,
      endAt: e.endAt,
      color: SOURCE_COLORS.EVENT,
      link: `/events`,
    });
  }

  for (const d of dues) {
    events.push({
      id: `dues-${d.id}`,
      source: "DUES",
      title: `${d.member.firstName} ${d.member.lastName} — ${d.periodLabel ?? "Cotisation"}`,
      description: `${Number(d.amount)} ${d.currency}`,
      startAt: d.dueDate,
      endAt: null,
      color: SOURCE_COLORS.DUES,
      link: `/members/dues`,
    });
  }

  for (const a of actions) {
    if (!a.dueDate) continue;
    events.push({
      id: `action-${a.id}`,
      source: "ACTION",
      title: a.title,
      description: a.responsibleName ?? a.description,
      startAt: a.dueDate,
      endAt: null,
      color: SOURCE_COLORS.ACTION,
      link: a.minuteId ? `/minutes/${a.minuteId}` : `/actions`,
    });
  }

  const year = from.getFullYear();
  for (const member of members) {
    if (!member.birthday) continue;
    const bday = member.birthday;
    let occurrence = setYear(bday, year);
    if (occurrence < from) occurrence = setYear(bday, year + 1);
    if (occurrence > to) continue;
    events.push({
      id: `birthday-${member.id}-${occurrence.getFullYear()}`,
      source: "BIRTHDAY",
      title: `🎂 ${member.firstName} ${member.lastName}`,
      startAt: occurrence,
      endAt: null,
      color: SOURCE_COLORS.BIRTHDAY,
      link: `/members`,
    });
  }

  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      source: n.source,
      title: n.title,
      description: n.description,
      startAt: n.startAt,
      endAt: n.endAt,
      color: getEventColor(n.source, n.color),
      link: `/calendar`,
    });
  }

  return events.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export function birthdayInMonth(birthday: Date, month: Date): Date | null {
  const day = birthday.getDate();
  const monthIdx = month.getMonth();
  const year = month.getFullYear();
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  if (day > lastDay) return null;
  return setDate(setMonth(setYear(birthday, year), monthIdx), day);
}