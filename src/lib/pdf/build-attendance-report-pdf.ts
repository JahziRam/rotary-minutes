import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAttendanceReportSummary } from "@/lib/queries/attendance-reports";
import type { AttendanceReportPDFData } from "@/lib/pdf/attendance-report-pdf";

const MEETING_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  STATUTORY: { fr: "Statutaire", en: "Statutory" },
  COMMITTEE: { fr: "Comité", en: "Committee" },
  COMMISSION: { fr: "Commission", en: "Commission" },
  GENERAL_ASSEMBLY: { fr: "Assemblée générale", en: "General assembly" },
  JOINT_MEETING: { fr: "Réunion conjointe", en: "Joint meeting" },
  GOVERNOR_VISIT: { fr: "Visite du gouverneur", en: "Governor visit" },
  TRAINING: { fr: "Formation", en: "Training" },
  SPECIAL: { fr: "Spéciale", en: "Special" },
};

export async function buildAttendanceReportPdfBuffer(
  clubId: string,
  clubName: string,
  locale: string
): Promise<{ buffer: Buffer; filename: string }> {
  const summary = await getAttendanceReportSummary(clubId);
  const dateLocale = locale === "en" ? enUS : fr;
  const isFr = locale === "fr";

  const data: AttendanceReportPDFData = {
    clubName,
    mandateLabel: summary.memberData.mandate.label,
    exportedAt: format(new Date(), "PPP", { locale: dateLocale }),
    clubRate: summary.clubRate,
    meetingsCount: summary.memberData.meetingsCount,
    memberRates: summary.memberData.rates,
    periodRates: summary.periodData.periods,
    meetingTypeRates: summary.typeData.rates,
    atRisk: summary.atRisk.map((m) => ({
      firstName: m.firstName,
      lastName: m.lastName,
      rate: m.rate,
      total: m.total,
    })),
    labels: {
      title: isFr ? "Rapport d'assiduité" : "Attendance report",
      overview: isFr ? "Vue d'ensemble" : "Overview",
      byMember: isFr ? "Par membre" : "By member",
      byPeriod: isFr ? "Par période" : "By period",
      byType: isFr ? "Par type de réunion" : "By meeting type",
      atRisk: isFr ? "Membres à risque" : "At-risk members",
      rate: isFr ? "Taux moyen" : "Average rate",
      meetings: isFr ? "Réunions" : "Meetings",
      generated: isFr ? "Généré le" : "Generated on",
    },
    meetingTypeLabels: Object.fromEntries(
      Object.entries(MEETING_TYPE_LABELS).map(([k, v]) => [k, v[isFr ? "fr" : "en"]])
    ),
  };

  const { renderAttendanceReportPdf } = await import("@/lib/pdf/render");
  const buffer = await renderAttendanceReportPdf(data);
  const safeName = clubName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  const filename = `attendance-${safeName}-${summary.memberData.mandate.label}.pdf`;

  return { buffer, filename };
}