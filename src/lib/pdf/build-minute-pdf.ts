import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import { excludeHonoraryMemberAttendances } from "@/lib/member-attendance-eligibility";
import { rasterizeClubDefaultLogoPng } from "@/lib/club-default-logo-raster";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";
import {
  buildMinuteAttendanceAnnex,
  MEMBER_ATTENDANCE_CATEGORIES,
} from "@/lib/minute-attendance-annex";
import { renderMinutePdf } from "@/lib/pdf/render";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";

export const attendanceWithMemberInclude = {
  include: {
    member: { select: { firstName: true, lastName: true, isHonoraryMember: true } },
  },
  orderBy: { category: "asc" as const },
} as const;

export const minutePdfInclude = {
  club: true,
  agendaItems: { orderBy: { sortOrder: "asc" as const } },
  meeting: { include: { attendances: attendanceWithMemberInclude } },
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
    attendances: Array<{
      category: string;
      guestName?: string | null;
      member?: { firstName: string; lastName: string } | null;
    }>;
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

  const memberAttendances = excludeHonoraryMemberAttendances(
    minute.meeting.attendances.filter((a) =>
      (MEMBER_ATTENDANCE_CATEGORIES as readonly string[]).includes(a.category)
    )
  );
  const present = memberAttendances.filter(
    (a) => a.category === "PRESENT" || a.category === "TRAVEL_RETURN"
  ).length;
  const total = memberAttendances.length;
  const rate = computeRecordedAttendanceRate(memberAttendances) ?? 0;

  const usesGeneratedLogo = !minute.club.logoUrl;
  let logoUrl: string | undefined;
  let logoAspectRatio: number | undefined;
  if (minute.club.logoUrl) {
    logoUrl = isDataUrl(minute.club.logoUrl)
      ? minute.club.logoUrl
      : resolveClubLogoUrl(minute.club.id, minute.club.logoUrl, baseUrl) ??
        minute.club.logoUrl;
  } else {
    const raster = await rasterizeClubDefaultLogoPng(minute.club.name);
    logoUrl = raster?.dataUrl;
    logoAspectRatio = raster?.aspectRatio;
  }

  return {
    club: {
      name: minute.club.name,
      address: minute.club.address ?? minute.club.meetingLocation ?? undefined,
      logoUrl,
      logoIsGenerated: usesGeneratedLogo,
      logoAspectRatio,
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
    annex: buildMinuteAttendanceAnnex(minute.meeting.attendances, locale),
    locale,
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