import { prisma } from "@/lib/prisma";
import { currentFiscalYear } from "@/lib/dues";
import {
  ROTARY_ATTENDANCE_GOAL,
  calculateAttendanceRate,
  getRotaryMandateYear,
} from "@/lib/rotary";

const MANDATE_PRESENT_CATEGORIES = new Set([
  "PRESENT",
  "TRAVEL_RETURN",
  "EXTERNAL_ATTENDANCE",
  "TRAVELING",
]);

export type MemberHubSummary = {
  linked: boolean;
  finalizedMinutesCount: number;
  recentFinalizedMinutes: Array<{ id: string; title: string; meetingDate: string }>;
  duesPendingCount: number;
  duesOverdueCount: number;
  attendanceRate: number;
  attendancePresent: number;
  attendanceTotal: number;
  attendanceGoal: number;
};

export async function getMemberHubSummary(
  clubId: string,
  userId: string
): Promise<MemberHubSummary | null> {
  const member = await prisma.member.findFirst({
    where: { clubId, userId, isActive: true },
    select: { id: true },
  });

  if (!member) {
    return {
      linked: false,
      finalizedMinutesCount: 0,
      recentFinalizedMinutes: [],
      duesPendingCount: 0,
      duesOverdueCount: 0,
      attendanceRate: 0,
      attendancePresent: 0,
      attendanceTotal: 0,
      attendanceGoal: ROTARY_ATTENDANCE_GOAL,
    };
  }

  const mandate = getRotaryMandateYear();
  const fiscalYear = currentFiscalYear();

  const [finalizedMinutesCount, recentFinalizedMinutes, dues, mandateMeetings] =
    await Promise.all([
      prisma.minute.count({
        where: { clubId, status: "FINALIZED" },
      }),
      prisma.minute.findMany({
        where: { clubId, status: "FINALIZED" },
        orderBy: { finalizedAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          meeting: { select: { date: true } },
        },
      }),
      prisma.memberDues.findMany({
        where: { memberId: member.id, fiscalYear },
        select: { status: true },
      }),
      prisma.meeting.findMany({
        where: {
          clubId,
          date: { gte: mandate.start, lte: mandate.end },
          attendances: { some: { memberId: member.id } },
        },
        select: {
          attendances: {
            where: { memberId: member.id },
            select: { category: true },
            take: 1,
          },
        },
      }),
    ]);

  let present = 0;
  let total = 0;
  for (const meeting of mandateMeetings) {
    const att = meeting.attendances[0];
    if (!att) continue;
    total++;
    if (MANDATE_PRESENT_CATEGORIES.has(att.category)) present++;
  }
  const attendanceRate =
    total > 0 ? Math.round(calculateAttendanceRate(present, total).rate) : 0;

  return {
    linked: true,
    finalizedMinutesCount,
    recentFinalizedMinutes: recentFinalizedMinutes.map((pv) => ({
      id: pv.id,
      title: pv.title,
      meetingDate: pv.meeting.date.toISOString(),
    })),
    duesPendingCount: dues.filter((d) => d.status === "PENDING").length,
    duesOverdueCount: dues.filter((d) => d.status === "OVERDUE").length,
    attendanceRate,
    attendancePresent: present,
    attendanceTotal: total,
    attendanceGoal: ROTARY_ATTENDANCE_GOAL,
  };
}