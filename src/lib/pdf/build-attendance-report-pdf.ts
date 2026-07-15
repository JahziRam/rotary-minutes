import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAttendanceReportSummary } from "@/lib/queries/attendance-reports";
import type { AttendanceReportPDFData } from "@/lib/pdf/attendance-report-pdf";
import { getAppName } from "@/lib/app-settings";
import { formatClubAddressForEmail } from "@/lib/email-branding";
import { prisma } from "@/lib/prisma";
import { rasterizeClubDefaultLogoPng } from "@/lib/club-default-logo-raster";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";
import { getAppBaseUrl } from "@/lib/app-url";

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
  const [summary, club, appName] = await Promise.all([
    getAttendanceReportSummary(clubId),
    prisma.club.findUnique({
      where: { id: clubId },
      select: {
        logoUrl: true,
        address: true,
        city: true,
        country: true,
        meetingLocation: true,
      },
    }),
    getAppName(),
  ]);
  const dateLocale = locale === "en" ? enUS : fr;
  const isFr = locale === "fr";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? getAppBaseUrl();
  let logoUrl: string | undefined;
  if (club?.logoUrl) {
    logoUrl = isDataUrl(club.logoUrl)
      ? club.logoUrl
      : resolveClubLogoUrl(clubId, club.logoUrl, baseUrl) ?? club.logoUrl;
  } else {
    logoUrl = (await rasterizeClubDefaultLogoPng(clubName))?.dataUrl;
  }

  const data: AttendanceReportPDFData = {
    clubName,
    clubAddress: formatClubAddressForEmail(club) ?? undefined,
    logoUrl,
    appName,
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