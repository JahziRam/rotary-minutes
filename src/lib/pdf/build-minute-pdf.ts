import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import { resolveClubLogoUrl } from "@/lib/media-url";
import { renderMinutePdf } from "@/lib/pdf/render";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";

export const minutePdfInclude = {
  club: true,
  agendaItems: { orderBy: { sortOrder: "asc" as const } },
  meeting: { include: { attendances: true } },
} as const;

type MinuteForPdf = {
  id: string;
  title: string;
  contentHash?: string | null;
  verifyUrl?: string | null;
  club: {
    id: string;
    name: string;
    address?: string | null;
    meetingLocation?: string | null;
    logoUrl?: string | null;
    language: string;
  };
  agendaItems: Array<{
    title: string;
    description?: string | null;
    decisions?: string | null;
    actions?: string | null;
  }>;
  meeting: {
    date: Date;
    location?: string | null;
    type: string;
    presidedBy?: string | null;
    secretary?: string | null;
    attendances: Array<{ category: string }>;
  };
};

export async function buildMinutePdfData(
  minute: MinuteForPdf,
  locale: string
): Promise<MinutePDFData> {
  const baseUrl = getAppBaseUrl();
  const dateLocale = locale === "en" ? enUS : fr;

  const hash =
    minute.contentHash ??
    generateMinuteHash({
      id: minute.id,
      title: minute.title,
      agendaItems: minute.agendaItems,
      meeting: minute.meeting,
      attendances: minute.meeting.attendances,
    });

  const verifyUrl = getVerifyUrl(hash, baseUrl, locale);
  const { default: QRCode } = await import("qrcode");
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200 });

  const present = minute.meeting.attendances.filter((a) => a.category === "PRESENT").length;
  const total = minute.meeting.attendances.length;
  const rate = computeRecordedAttendanceRate(minute.meeting.attendances) ?? 0;

  return {
    club: {
      name: minute.club.name,
      address: minute.club.address ?? minute.club.meetingLocation ?? undefined,
      logoUrl:
        resolveClubLogoUrl(minute.club.id, minute.club.logoUrl, baseUrl) ??
        minute.club.logoUrl ??
        undefined,
    },
    meeting: {
      date: format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale }),
      location: minute.meeting.location ?? undefined,
      type: minute.meeting.type,
      presidedBy: minute.meeting.presidedBy ?? undefined,
      secretary: minute.meeting.secretary ?? undefined,
    },
    title: minute.title,
    attendances: { present, absent: total - present, rate },
    agendaItems: minute.agendaItems.map((item) => ({
      title: item.title,
      description: item.description ?? undefined,
      decisions: item.decisions ?? undefined,
      actions: item.actions ?? undefined,
    })),
    hash,
    qrCodeDataUrl,
    verifyUrl,
  };
}

export function minutePdfFilename(minute: { id: string; title: string }): string {
  const slug = minute.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `pv-${slug || minute.id}.pdf`;
}

export async function buildMinutePdfBuffer(
  minute: MinuteForPdf,
  locale: string
): Promise<{ buffer: Buffer; filename: string }> {
  const data = await buildMinutePdfData(minute, locale);
  const buffer = await renderMinutePdf(data);
  return { buffer, filename: minutePdfFilename(minute) };
}