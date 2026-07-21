import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { computeRecordedAttendanceRate, isAttendancePresent } from "@/lib/rotary";
import { rasterizeClubDefaultLogoPng } from "@/lib/club-default-logo-raster";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";
import {
  buildMinuteAttendanceAnnex,
  MEMBER_ATTENDANCE_CATEGORIES,
} from "@/lib/minute-attendance-annex";
import { getMemberDefaultAvatarDataUrl } from "@/lib/member-default-avatar";
import { loadBirthdayMembers } from "@/lib/queries/birthday-members";
import { renderMinutePdf } from "@/lib/pdf/render";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";

export const attendanceWithMemberInclude = {
  include: {
    member: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isHonoraryMember: true,
        photoUrl: true,
      },
    },
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
    minuteShowMemberPhotos?: boolean;
    minuteMemberPhotoSize?: string | null;
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
      memberId?: string | null;
      member?: {
        id?: string;
        firstName: string;
        lastName: string;
        isHonoraryMember?: boolean;
        photoUrl?: string | null;
      } | null;
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

  const memberAttendances = minute.meeting.attendances.filter(
    (a) =>
      !!a.memberId &&
      !a.member?.isHonoraryMember &&
      (MEMBER_ATTENDANCE_CATEGORIES as readonly string[]).includes(a.category)
  );
  const present = memberAttendances.filter((a) => isAttendancePresent(a.category)).length;
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
    annex: await (async () => {
      const birthdayMembers = await loadBirthdayMembers(minute.club.id);
      const annex = buildMinuteAttendanceAnnex(minute.meeting.attendances, locale, {
        showMemberPhotos: !!minute.club.minuteShowMemberPhotos,
        memberPhotoSize: minute.club.minuteMemberPhotoSize,
        preferDataUrlOnly: true,
        meetingDate: minute.meeting.date,
        birthdayMembers,
      });
      // Server-only: embed default wheel avatar for members without a data-URL photo.
      if (annex.showMemberPhotos) {
        const fallback = getMemberDefaultAvatarDataUrl();
        for (const group of annex.memberGroups) {
          for (const person of group.people) {
            if (!person.photoUrl || !isDataUrl(person.photoUrl)) {
              person.photoUrl = fallback;
            }
          }
        }
        for (const entry of annex.weekBirthdays) {
          if (entry.kind === "member" && (!entry.photoUrl || !isDataUrl(entry.photoUrl))) {
            entry.photoUrl = fallback;
          }
        }
      }
      return annex;
    })(),
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