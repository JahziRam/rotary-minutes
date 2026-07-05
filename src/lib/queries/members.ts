import { addDays, isWithinInterval } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getUpcomingBirthdays(clubId: string, withinDays = 14) {
  const members = await prisma.member.findMany({
    where: { clubId, isActive: true, birthday: { not: null } },
    select: { id: true, firstName: true, lastName: true, birthday: true },
  });

  const now = new Date();
  const end = addDays(now, withinDays);

  return members
    .filter((m) => {
      if (!m.birthday) return false;
      const bday = new Date(m.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < now) {
        thisYear.setFullYear(now.getFullYear() + 1);
      }
      return isWithinInterval(thisYear, { start: now, end });
    })
    .map((m) => ({
      ...m,
      nextBirthday: new Date(
        now.getFullYear(),
        m.birthday!.getMonth(),
        m.birthday!.getDate()
      ),
    }))
    .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
}

export async function getMembersWithLowAttendance(
  clubId: string,
  thresholdPercent = 50,
  minMeetings = 3
) {
  const members = await prisma.member.findMany({
    where: { clubId, isActive: true },
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
        if (att.category === "PRESENT") present++;
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