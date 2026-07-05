import { prisma } from "@/lib/prisma";
import { getClubAnnualAttendance } from "@/lib/queries/attendance";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardStats(clubId: string, userId: string) {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [attendance, meetingsThisMonth, minutes, openActions, scheduledEmails, unreadNotifications] =
    await Promise.all([
      getClubAnnualAttendance(clubId),
      prisma.meeting.count({
        where: { clubId, date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.minute.findMany({
        where: { clubId, status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          meeting: true,
          author: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.agendaItem.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          minute: { clubId, status: { not: "ARCHIVED" } },
        },
      }),
      prisma.emailCampaign.count({
        where: { clubId, status: "SCHEDULED" },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

  const nextMeeting = await prisma.meeting.findFirst({
    where: { clubId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  return {
    meetingsCount: attendance.meetingsCount,
    mandateLabel: attendance.mandate.label,
    meetingsThisMonth,
    annualAttendance: attendance.rate,
    openActions,
    scheduledEmails,
    notificationCount: unreadNotifications,
    nextMeeting,
    recentMinutes: minutes,
  };
}