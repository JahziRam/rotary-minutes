import { differenceInCalendarDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getRotaryMandateYear } from "@/lib/rotary";
import { currentFiscalYear } from "@/lib/dues";

export type HealthIssue = {
  key: string;
  severity: "critical" | "warning" | "info";
  messageFr: string;
  messageEn: string;
  count?: number;
  link?: string;
};

export type ClubHealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  issues: HealthIssue[];
  summaryFr: string;
  summaryEn: string;
};

export async function computeClubHealthScore(clubId: string): Promise<ClubHealthScore> {
  const today = startOfDay(new Date());
  const mandate = getRotaryMandateYear();
  const fiscalYear = currentFiscalYear();
  const issues: HealthIssue[] = [];
  let penalty = 0;

  const [lateMinutes, overdueDues, openActions, recentMeetings, finalizedInMandate] =
    await Promise.all([
      prisma.minute.findMany({
        where: {
          clubId,
          status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
          meeting: { date: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
        },
        select: { id: true },
      }),
      prisma.memberDues.count({
        where: { clubId, fiscalYear, status: "OVERDUE" },
      }),
      prisma.clubAction.count({
        where: { clubId, status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { lt: today } },
      }),
      prisma.meeting.count({
        where: { clubId, date: { gte: mandate.start, lte: mandate.end } },
      }),
      prisma.minute.count({
        where: {
          clubId,
          status: "FINALIZED",
          finalizedAt: { gte: mandate.start, lte: mandate.end },
        },
      }),
    ]);

  if (lateMinutes.length > 0) {
    penalty += Math.min(30, lateMinutes.length * 10);
    issues.push({
      key: "late_minutes",
      severity: "critical",
      messageFr: `${lateMinutes.length} PV non finalisé(s) depuis plus de 48h`,
      messageEn: `${lateMinutes.length} minute(s) not finalized for 48h+`,
      count: lateMinutes.length,
      link: "/minutes",
    });
  }

  if (overdueDues > 0) {
    penalty += Math.min(25, overdueDues * 2);
    issues.push({
      key: "overdue_dues",
      severity: "warning",
      messageFr: `${overdueDues} cotisation(s) en retard`,
      messageEn: `${overdueDues} overdue dues`,
      count: overdueDues,
      link: "/dues",
    });
  }

  if (openActions > 0) {
    penalty += Math.min(15, openActions * 3);
    issues.push({
      key: "overdue_actions",
      severity: "warning",
      messageFr: `${openActions} tâche(s) en retard`,
      messageEn: `${openActions} overdue task(s)`,
      count: openActions,
      link: "/actions",
    });
  }

  const pendingMinutes = await prisma.minute.findMany({
    where: {
      clubId,
      status: { in: ["DRAFT", "IN_PROGRESS"] },
      meeting: { date: { gte: mandate.start, lte: today } },
    },
    include: { meeting: { select: { date: true } } },
  });

  for (const m of pendingMinutes) {
    const days = differenceInCalendarDays(today, startOfDay(m.meeting.date));
    if (days >= 2 && days <= 7) {
      issues.push({
        key: `pv_pending_${m.id}`,
        severity: "info",
        messageFr: `PV en attente depuis ${days} jour(s)`,
        messageEn: `Minutes pending for ${days} day(s)`,
        link: `/minutes/${m.id}/edit`,
      });
    }
  }

  if (recentMeetings > 0 && finalizedInMandate < recentMeetings * 0.5) {
    penalty += 10;
    issues.push({
      key: "low_finalization",
      severity: "warning",
      messageFr: "Moins de 50 % des réunions ont un PV finalisé ce mandat",
      messageEn: "Less than 50% of meetings have finalized minutes this mandate",
      link: "/minutes",
    });
  }

  const score = Math.max(0, 100 - penalty);
  const grade: ClubHealthScore["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  const summaryFr =
    issues.length === 0
      ? "Club à jour — excellente hygiène opérationnelle."
      : `${issues.length} point(s) d'attention — score ${score}/100`;
  const summaryEn =
    issues.length === 0
      ? "Club is up to date — excellent operational health."
      : `${issues.length} item(s) need attention — score ${score}/100`;

  return { score, grade, issues, summaryFr, summaryEn };
}