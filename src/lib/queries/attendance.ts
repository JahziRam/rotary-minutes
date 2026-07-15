import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear, calculateAttendanceRate, isAttendancePresent } from "@/lib/rotary";
import { shouldCountAttendanceForMemberId } from "@/lib/member-attendance-eligibility";
import { getHonoraryMemberIds } from "@/lib/member-attendance-eligibility.server";

export async function getClubAnnualAttendance(clubId: string) {
  const mandate = getRotaryMandateYear();

  const [honoraryMemberIds, meetings] = await Promise.all([
    getHonoraryMemberIds(clubId),
    prisma.meeting.findMany({
      where: { clubId, date: { gte: mandate.start, lte: mandate.end } },
      include: { attendances: true },
      orderBy: { date: "asc" },
    }),
  ]);

  let totalPresent = 0;
  let totalSlots = 0;

  for (const meeting of meetings) {
    for (const a of meeting.attendances) {
      if (!shouldCountAttendanceForMemberId(a.memberId, honoraryMemberIds)) continue;
      totalSlots++;
      if (isAttendancePresent(a.category)) {
        totalPresent++;
      }
    }
  }

  const rate =
    totalSlots > 0
      ? Math.round(calculateAttendanceRate(totalPresent, totalSlots).rate)
      : 0;

  return { rate, meetingsCount: meetings.length, mandate };
}