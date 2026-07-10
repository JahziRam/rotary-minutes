import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear, calculateAttendanceRate } from "@/lib/rotary";

export async function getClubAnnualAttendance(clubId: string) {
  const mandate = getRotaryMandateYear();

  const meetings = await prisma.meeting.findMany({
    where: { clubId, date: { gte: mandate.start, lte: mandate.end } },
    include: { attendances: true },
    orderBy: { date: "asc" },
  });

  let totalPresent = 0;
  let totalSlots = 0;

  for (const meeting of meetings) {
    for (const a of meeting.attendances) {
      totalSlots++;
      if (
        a.category === "PRESENT" ||
        a.category === "TRAVEL_RETURN" ||
        a.category === "EXTERNAL_ATTENDANCE" ||
        a.category === "TRAVELING"
      ) {
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