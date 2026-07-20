import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import {
  buildPaginatedResult,
  type ParsedListParams,
  type PaginatedResult,
} from "@/lib/server-list";

export type MeetingListRow = {
  id: string;
  date: string;
  type: string;
  location: string | null;
  presidedBy: string | null;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  isLive: boolean;
  attendanceRate: number | null;
  agendaTitles: string[];
  minuteId: string | null;
  clubName: string;
};

function buildMeetingWhere(
  clubId: string,
  params: ParsedListParams,
  extraWhere?: Prisma.MeetingWhereInput
): Prisma.MeetingWhereInput {
  const where: Prisma.MeetingWhereInput = { clubId, ...extraWhere };

  if (params.q) {
    where.OR = [
      { location: { contains: params.q, mode: "insensitive" } },
      { presidedBy: { contains: params.q, mode: "insensitive" } },
      { title: { contains: params.q, mode: "insensitive" } },
      { secretary: { contains: params.q, mode: "insensitive" } },
      {
        minute: {
          agendaItems: {
            some: { title: { contains: params.q, mode: "insensitive" } },
          },
        },
      },
    ];
  }

  return where;
}

export async function searchMeetingsPaginated(
  clubId: string,
  params: ParsedListParams,
  extraWhere?: Prisma.MeetingWhereInput
): Promise<PaginatedResult<MeetingListRow>> {
  const where = buildMeetingWhere(clubId, params, extraWhere);

  const [total, meetings] = await Promise.all([
    prisma.meeting.count({ where }),
    prisma.meeting.findMany({
      where,
      include: {
        attendances: {
          include: { member: { select: { isHonoraryMember: true } } },
        },
        minute: {
          select: {
            id: true,
            agendaItems: {
              orderBy: { sortOrder: "asc" },
              select: { title: true },
            },
          },
        },
        club: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);

  const items = meetings.map((meeting) => ({
    id: meeting.id,
    date: meeting.date.toISOString(),
    type: meeting.type,
    location: meeting.location,
    presidedBy: meeting.presidedBy,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    isLive: meeting.isLive,
    attendanceRate: computeRecordedAttendanceRate(meeting.attendances),
    agendaTitles: meeting.minute?.agendaItems.map((item) => item.title) ?? [],
    minuteId: meeting.minute?.id ?? null,
    clubName: meeting.club.name,
  }));

  return buildPaginatedResult(items, total, params.page, params.pageSize);
}