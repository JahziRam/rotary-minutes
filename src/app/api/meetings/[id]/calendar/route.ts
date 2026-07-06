import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMeetingIcs } from "@/lib/calendar-ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { club: { select: { id: true, name: true } } },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const isClubMember = session?.user?.memberships?.some(
    (m) => m.clubId === meeting.clubId
  );

  if (!isSuperAdmin && !isClubMember) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ics = generateMeetingIcs({
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    location: meeting.location,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    clubName: meeting.club.name,
  });

  const slug = (meeting.title ?? "reunion").replace(/\s+/g, "-").toLowerCase();

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}