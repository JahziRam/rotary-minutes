import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear, calculateAttendanceRate } from "@/lib/rotary";
import type { MeetingType } from "@/generated/prisma/client";

const PRESENT_CATEGORIES = new Set(["PRESENT", "EXTERNAL_ATTENDANCE", "TRAVELING"]);

function isPresent(category: string): boolean {
  return PRESENT_CATEGORIES.has(category);
}

export type MemberAttendanceRate = {
  memberId: string;
  firstName: string;
  lastName: string;
  present: number;
  total: number;
  rate: number;
};

export type PeriodAttendanceRate = {
  period: string;
  label: string;
  present: number;
  total: number;
  rate: number;
};

export type MeetingTypeRate = {
  type: MeetingType;
  meetingsCount: number;
  present: number;
  total: number;
  rate: number;
};

export type AtRiskMember = MemberAttendanceRate & {
  threshold: number;
};

export async function perMemberRates(
  clubId: string,
  options?: { mandateStart?: Date; mandateEnd?: Date }
) {
  const mandate = getRotaryMandateYear();
  const start = options?.mandateStart ?? mandate.start;
  const end = options?.mandateEnd ?? mandate.end;

  const [members, meetings] = await Promise.all([
    prisma.member.findMany({
      where: { clubId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.meeting.findMany({
      where: { clubId, date: { gte: start, lte: end } },
      include: { attendances: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const rates: MemberAttendanceRate[] = members.map((member) => {
    let present = 0;
    let total = 0;
    for (const meeting of meetings) {
      const att = meeting.attendances.find((a) => a.memberId === member.id);
      if (att) {
        total++;
        if (isPresent(att.category)) present++;
      }
    }
    const rate =
      total > 0 ? Math.round(calculateAttendanceRate(present, total).rate) : 0;
    return {
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      present,
      total,
      rate,
    };
  });

  return { rates, mandate: { start, end, label: mandate.label }, meetingsCount: meetings.length };
}

export async function perPeriodRates(clubId: string) {
  const mandate = getRotaryMandateYear();
  const meetings = await prisma.meeting.findMany({
    where: { clubId, date: { gte: mandate.start, lte: mandate.end } },
    include: { attendances: true },
    orderBy: { date: "asc" },
  });

  const monthLabels = [
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  ];

  const startYear = mandate.start.getFullYear();
  const periods: PeriodAttendanceRate[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (6 + i) % 12;
    const year = monthIndex >= 6 ? startYear : startYear + 1;
    const monthMeetings = meetings.filter(
      (m) => m.date.getMonth() === monthIndex && m.date.getFullYear() === year
    );
    let present = 0;
    let total = 0;
    for (const meeting of monthMeetings) {
      for (const att of meeting.attendances) {
        if (!att.memberId) continue;
        total++;
        if (isPresent(att.category)) present++;
      }
    }
    periods.push({
      period: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      label: monthLabels[i],
      present,
      total,
      rate: total > 0 ? Math.round(calculateAttendanceRate(present, total).rate) : 0,
    });
  }

  return { periods, mandate };
}

export async function perMeetingType(clubId: string) {
  const mandate = getRotaryMandateYear();
  const meetings = await prisma.meeting.findMany({
    where: { clubId, date: { gte: mandate.start, lte: mandate.end } },
    include: { attendances: true },
    orderBy: { date: "asc" },
  });

  const byType = new Map<MeetingType, { meetingsCount: number; present: number; total: number }>();

  for (const meeting of meetings) {
    const entry = byType.get(meeting.type) ?? { meetingsCount: 0, present: 0, total: 0 };
    entry.meetingsCount++;
    for (const att of meeting.attendances) {
      if (!att.memberId) continue;
      entry.total++;
      if (isPresent(att.category)) entry.present++;
    }
    byType.set(meeting.type, entry);
  }

  const rates: MeetingTypeRate[] = [...byType.entries()].map(([type, data]) => ({
    type,
    meetingsCount: data.meetingsCount,
    present: data.present,
    total: data.total,
    rate:
      data.total > 0
        ? Math.round(calculateAttendanceRate(data.present, data.total).rate)
        : 0,
  }));

  return { rates, mandate };
}

export async function atRiskMembers(
  clubId: string,
  thresholdPercent = 50,
  minMeetings = 3
) {
  const { rates } = await perMemberRates(clubId);
  const atRisk: AtRiskMember[] = rates
    .filter((r) => r.total >= minMeetings && r.rate < thresholdPercent)
    .map((r) => ({ ...r, threshold: thresholdPercent }))
    .sort((a, b) => a.rate - b.rate);

  return atRisk;
}

export async function getAttendanceReportSummary(clubId: string) {
  const [memberData, periodData, typeData, atRisk] = await Promise.all([
    perMemberRates(clubId),
    perPeriodRates(clubId),
    perMeetingType(clubId),
    atRiskMembers(clubId),
  ]);

  const clubRate =
    memberData.rates.length > 0
      ? Math.round(
          memberData.rates.reduce((sum, r) => sum + r.rate, 0) / memberData.rates.length
        )
      : 0;

  return {
    clubRate,
    memberData,
    periodData,
    typeData,
    atRisk,
  };
}