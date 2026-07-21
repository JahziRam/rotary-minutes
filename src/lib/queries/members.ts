import { addDays, isWithinInterval } from "date-fns";
import { prisma } from "@/lib/prisma";
import { attendanceEligibleMemberWhere } from "@/lib/member-attendance-eligibility";

export type UpcomingBirthday = {
  id: string;
  firstName: string;
  lastName: string;
  nextBirthday: Date;
  kind: "member" | "spouse";
  /** Member name when kind is spouse */
  relatedMemberName?: string;
};

function nextOccurrence(birthday: Date, now: Date): Date {
  const next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (next < now) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
}

export async function getUpcomingBirthdays(
  clubId: string,
  withinDays = 14
): Promise<UpcomingBirthday[]> {
  const members = await prisma.member.findMany({
    where: {
      clubId,
      isActive: true,
      OR: [{ birthday: { not: null } }, { spouseBirthday: { not: null } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthday: true,
      spouseFirstName: true,
      spouseLastName: true,
      spouseBirthday: true,
    },
  });

  const now = new Date();
  const end = addDays(now, withinDays);
  const items: UpcomingBirthday[] = [];

  for (const m of members) {
    if (m.birthday) {
      const nextBirthday = nextOccurrence(new Date(m.birthday), now);
      if (isWithinInterval(nextBirthday, { start: now, end })) {
        items.push({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          nextBirthday,
          kind: "member",
        });
      }
    }
    if (m.spouseBirthday) {
      const nextBirthday = nextOccurrence(new Date(m.spouseBirthday), now);
      if (isWithinInterval(nextBirthday, { start: now, end })) {
        items.push({
          id: `spouse-${m.id}`,
          firstName: m.spouseFirstName || "—",
          lastName: m.spouseLastName || "",
          nextBirthday,
          kind: "spouse",
          relatedMemberName: `${m.firstName} ${m.lastName}`,
        });
      }
    }
  }

  return items.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
}

export async function getMembersWithLowAttendance(
  clubId: string,
  thresholdPercent = 50,
  minMeetings = 3
) {
  const members = await prisma.member.findMany({
    where: attendanceEligibleMemberWhere(clubId),
    select: { id: true, firstName: true, lastName: true },
  });

  const meetings = await prisma.meeting.findMany({
    where: { clubId },
    include: { attendances: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  const alerts: Array<{ member: (typeof members)[0]; rate: number; total: number }> = [];

  for (const member of members) {
    let present = 0;
    let total = 0;
    for (const meeting of meetings) {
      const att = meeting.attendances.find((a) => a.memberId === member.id);
      if (att) {
        total++;
        if (att.category === "PRESENT" || att.category === "TRAVEL_RETURN") present++;
      }
    }
    if (total >= minMeetings) {
      const rate = Math.round((present / total) * 100);
      if (rate < thresholdPercent) {
        alerts.push({ member, rate, total });
      }
    }
  }

  return alerts.sort((a, b) => a.rate - b.rate);
}