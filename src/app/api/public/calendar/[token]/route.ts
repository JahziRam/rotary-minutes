import { NextResponse } from "next/server";
import { addMonths, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { generateClubCalendarIcs } from "@/lib/calendar-ics";
import { getAppName } from "@/lib/app-settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const club = await prisma.club.findFirst({
    where: { publicCalendarToken: token, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!club) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const meetings = await prisma.meeting.findMany({
    where: {
      clubId: club.id,
      date: { gte: subMonths(now, 3), lte: addMonths(now, 12) },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      location: true,
      startTime: true,
      endTime: true,
    },
  });

  const appName = await getAppName();
  const ics = generateClubCalendarIcs(
    club.name,
    meetings.map((m) => ({
      id: m.id,
      title: m.title,
      date: m.date,
      location: m.location,
      startTime: m.startTime,
      endTime: m.endTime,
      clubName: club.name,
    })),
    appName
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${club.slug}-meetings.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}