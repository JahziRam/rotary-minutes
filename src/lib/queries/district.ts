import { prisma } from "@/lib/prisma";
import { getClubAnnualAttendance } from "@/lib/queries/attendance";
import { getRotaryMandateYear } from "@/lib/rotary";

export type DistrictClubStat = {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  finalizedMinutesCount: number;
  attendanceRate: number;
  meetingsCount: number;
};

export async function getDistrictOverview(district: string) {
  const mandate = getRotaryMandateYear();

  const clubs = await prisma.club.findMany({
    where: { district, isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      memberCount: true,
      _count: {
        select: {
          minutes: { where: { status: "FINALIZED" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clubStats: DistrictClubStat[] = await Promise.all(
    clubs.map(async (club) => {
      const attendance = await getClubAnnualAttendance(club.id);
      return {
        id: club.id,
        name: club.name,
        city: club.city,
        memberCount: club.memberCount,
        finalizedMinutesCount: club._count.minutes,
        attendanceRate: attendance.rate,
        meetingsCount: attendance.meetingsCount,
      };
    })
  );

  const totalClubs = clubStats.length;
  const totalFinalizedMinutes = clubStats.reduce(
    (sum, club) => sum + club.finalizedMinutesCount,
    0
  );
  const avgAttendance =
    totalClubs > 0
      ? Math.round(
          clubStats.reduce((sum, club) => sum + club.attendanceRate, 0) / totalClubs
        )
      : 0;

  return {
    district,
    mandate,
    totalClubs,
    totalFinalizedMinutes,
    avgAttendance,
    clubs: clubStats,
  };
}

export async function getDistrictBenchmark(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { district: true },
  });
  if (!club?.district) return null;

  const [clubAttendance, overview] = await Promise.all([
    getClubAnnualAttendance(clubId),
    getDistrictOverview(club.district),
  ]);

  const clubRow = overview.clubs.find((c) => c.id === clubId);
  const totalClubs = overview.totalClubs;

  return {
    district: club.district,
    mandate: clubAttendance.mandate,
    club: {
      attendanceRate: clubAttendance.rate,
      meetingsCount: clubAttendance.meetingsCount,
      finalizedMinutesCount: clubRow?.finalizedMinutesCount ?? 0,
    },
    districtAverage: {
      attendanceRate: overview.avgAttendance,
      meetingsCount:
        totalClubs > 0
          ? Math.round(
              overview.clubs.reduce((sum, c) => sum + c.meetingsCount, 0) / totalClubs
            )
          : 0,
      finalizedMinutesCount:
        totalClubs > 0 ? Math.round(overview.totalFinalizedMinutes / totalClubs) : 0,
    },
  };
}

export async function getDistrictFinalizedMinutes(district: string, limit = 50) {
  return prisma.minute.findMany({
    where: {
      status: "FINALIZED",
      club: { district, isActive: true },
    },
    include: {
      club: { select: { id: true, name: true } },
      meeting: { select: { date: true, type: true } },
    },
    orderBy: { finalizedAt: "desc" },
    take: limit,
  });
}

export async function listDistrictAccessGrants() {
  try {
    return await prisma.districtAccess.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        grantedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ district: "asc" }, { grantedAt: "desc" }],
    });
  } catch (e) {
    console.error("[listDistrictAccessGrants]", e);
    return [];
  }
}

export async function listDistinctDistricts() {
  const rows = await prisma.club.findMany({
    where: { isActive: true, district: { not: null } },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  return rows.map((r) => r.district!).filter(Boolean);
}