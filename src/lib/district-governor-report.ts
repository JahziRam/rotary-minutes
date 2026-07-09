import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear } from "@/lib/rotary";
import { currentFiscalYear } from "@/lib/dues";

export async function buildDistrictGovernorReport(district: string) {
  const mandate = getRotaryMandateYear();
  const fiscalYear = currentFiscalYear();

  const clubs = await prisma.club.findMany({
    where: { district, isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      memberCount: true,
      _count: {
        select: {
          members: { where: { isActive: true } },
          meetings: { where: { date: { gte: mandate.start, lte: mandate.end } } },
          minutes: { where: { status: "FINALIZED", finalizedAt: { gte: mandate.start } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clubIds = clubs.map((c) => c.id);
  const overdueDues = await prisma.memberDues.groupBy({
    by: ["clubId"],
    where: { clubId: { in: clubIds }, fiscalYear, status: "OVERDUE" },
    _count: { id: true },
  });
  const overdueMap = new Map(overdueDues.map((d) => [d.clubId, d._count.id]));

  const pendingMinutes = await prisma.minute.groupBy({
    by: ["clubId"],
    where: {
      clubId: { in: clubIds },
      status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
      meeting: { date: { lt: new Date() } },
    },
    _count: { id: true },
  });
  const pendingMap = new Map(pendingMinutes.map((m) => [m.clubId, m._count.id]));

  return {
    district,
    mandateLabel: mandate.label,
    generatedAt: new Date().toISOString(),
    clubs: clubs.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      activeMembers: c._count.members,
      meetingsThisMandate: c._count.meetings,
      finalizedMinutes: c._count.minutes,
      overdueDues: overdueMap.get(c.id) ?? 0,
      pendingMinutes: pendingMap.get(c.id) ?? 0,
      complianceScore: computeCompliance(c._count.meetings, c._count.minutes, overdueMap.get(c.id) ?? 0),
    })),
    totals: {
      clubs: clubs.length,
      members: clubs.reduce((s, c) => s + c._count.members, 0),
      meetings: clubs.reduce((s, c) => s + c._count.meetings, 0),
      finalizedMinutes: clubs.reduce((s, c) => s + c._count.minutes, 0),
      overdueDues: [...overdueMap.values()].reduce((s, n) => s + n, 0),
      pendingMinutes: [...pendingMap.values()].reduce((s, n) => s + n, 0),
    },
  };
}

function computeCompliance(meetings: number, finalized: number, overdue: number): number {
  let score = 100;
  if (meetings > 0) {
    const rate = finalized / meetings;
    score -= Math.round((1 - rate) * 40);
  }
  score -= Math.min(30, overdue * 2);
  return Math.max(0, score);
}

export function governorReportToCsv(report: Awaited<ReturnType<typeof buildDistrictGovernorReport>>): string {
  const headers = [
    "Club",
    "Ville",
    "Membres actifs",
    "Réunions mandat",
    "PV finalisés",
    "Cotisations en retard",
    "PV en attente",
    "Score conformité",
  ];
  const lines = [headers.join(";")];
  for (const c of report.clubs) {
    lines.push(
      [
        c.name,
        c.city,
        c.activeMembers,
        c.meetingsThisMandate,
        c.finalizedMinutes,
        c.overdueDues,
        c.pendingMinutes,
        c.complianceScore,
      ].join(";")
    );
  }
  return lines.join("\n");
}