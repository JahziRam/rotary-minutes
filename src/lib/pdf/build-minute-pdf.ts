import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { computeRecordedAttendanceRate, isAttendancePresent } from "@/lib/rotary";
import { isDataUrl } from "@/lib/image-data-url";
import { resolveClubLogoUrl } from "@/lib/media-url";
import {
  buildMinuteAttendanceAnnex,
  MEMBER_ATTENDANCE_CATEGORIES,
} from "@/lib/minute-attendance-annex";
import { getMemberDefaultAvatarDataUrl } from "@/lib/member-default-avatar";
import { loadBirthdayMembers } from "@/lib/queries/birthday-members";
import { isPdfSafeImageSrc, toPdfEmbedImage } from "@/lib/pdf/pdf-image";
import { renderMinutePdf } from "@/lib/pdf/render";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";

/**
 * PDF path: NEVER load photoUrl blobs into the query (OOM on large clubs).
 * Annex photos use a single shared default avatar JPEG for reliability.
 */
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

/**
 * UI detail/edit/preview: never select photoUrl blobs.
 * Thumbnails use /api/media/member/[id]/photo on demand.
 */
export const attendanceWithMemberLightInclude = {
  include: {
    member: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isHonoraryMember: true,
      },
    },
  },
  orderBy: { category: "asc" as const },
} as const;

/** Safe include for PDF route — no photoUrl column (can be multi-MB data URLs). */
export const minutePdfInclude = {
  club: {
    select: {
      id: true,
      name: true,
      address: true,
      meetingLocation: true,
      logoUrl: true,
      language: true,
      minuteShowMemberPhotos: true,
      minuteMemberPhotoSize: true,
    },
  },
  agendaItems: { orderBy: { sortOrder: "asc" as const } },
  meeting: { include: { attendances: attendanceWithMemberLightInclude } },
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

type PdfBuildOptions = {
  /** When false, annex shows no photos (more reliable / lower memory). */
  embedPhotos?: boolean;
  /** When true, skip custom club logo (use generated wordmark only). */
  skipCustomLogo?: boolean;
  /** When true, no images at all (logo, QR, photos) — max reliability. */
  stripAllImages?: boolean;
};

function stripNullBytes(text: string | null | undefined): string | undefined {
  if (text == null) return undefined;
  // Null bytes / control chars can break PDF text encoding
  return text.replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export async function buildMinutePdfData(
  minute: MinuteForPdf,
  locale: string,
  options: PdfBuildOptions = {}
): Promise<MinutePDFData> {
  const stripAllImages = options.stripAllImages === true;
  const embedPhotos = !stripAllImages && options.embedPhotos !== false;
  const skipCustomLogo = stripAllImages || options.skipCustomLogo === true;
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

  // QR → small JPEG only (raw PNG from qrcode can crash react-pdf intermittently)
  let qrCodeDataUrl = "";
  if (!stripAllImages) {
    try {
      const { default: QRCode } = await import("qrcode");
      const rawQr = await QRCode.toDataURL(verifyUrl, {
        width: 128,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      qrCodeDataUrl =
        (await toPdfEmbedImage(rawQr, { maxEdge: 96 })) ?? "";
      if (!isPdfSafeImageSrc(qrCodeDataUrl)) qrCodeDataUrl = "";
    } catch {
      qrCodeDataUrl = "";
    }
  }

  const memberAttendances = minute.meeting.attendances.filter(
    (a) =>
      !!a.memberId &&
      !a.member?.isHonoraryMember &&
      (MEMBER_ATTENDANCE_CATEGORIES as readonly string[]).includes(a.category)
  );
  const present = memberAttendances.filter((a) => isAttendancePresent(a.category)).length;
  const total = memberAttendances.length;
  const rate = computeRecordedAttendanceRate(memberAttendances) ?? 0;

  let logoUrl: string | undefined;
  let logoAspectRatio: number | undefined;

  if (!skipCustomLogo && minute.club.logoUrl) {
    const raw = minute.club.logoUrl.trim();
    // SVG + sharp on Vercel often fails (fontconfig) → skip custom SVG logos
    const isSvg =
      raw.startsWith("data:image/svg") ||
      raw.includes("image/svg+xml") ||
      /\.svg(\?|$)/i.test(raw);

    if (!isSvg) {
      const rawLogo = isDataUrl(raw)
        ? raw
        : resolveClubLogoUrl(minute.club.id, raw, baseUrl) ?? raw;
      const logoSrc = rawLogo?.startsWith("/")
        ? `${baseUrl.replace(/\/$/, "")}${rawLogo}`
        : rawLogo;
      logoUrl = await toPdfEmbedImage(logoSrc, { maxEdge: 160 });
    }
  }

  // Do NOT rasterize SVG wordmark / default logo via sharp on the PDF path:
  // fontconfig + large PNG embeds cause intermittent TypeError 'S' on Vercel.
  // Missing logoUrl → ClubDefaultLogoPdf (text-only, reliable).

  const birthdayMembers = stripAllImages
    ? []
    : await loadBirthdayMembers(minute.club.id);
  const showPhotos =
    embedPhotos && !!minute.club.minuteShowMemberPhotos;

  const annex = buildMinuteAttendanceAnnex(minute.meeting.attendances, locale, {
    showMemberPhotos: showPhotos,
    memberPhotoSize: minute.club.minuteMemberPhotoSize,
    // Do not pull individual photo blobs — use one shared default for all faces.
    preferDataUrlOnly: true,
    meetingDate: minute.meeting.date,
    birthdayMembers,
  });

  if (annex.showMemberPhotos) {
    // Single shared avatar JPEG: never embed raw PNG avatar file.
    const fallback = getMemberDefaultAvatarDataUrl();
    const safe = await toPdfEmbedImage(fallback, { maxEdge: 48 });
    if (safe && isPdfSafeImageSrc(safe)) {
      for (const group of annex.memberGroups) {
        for (const person of group.people) {
          person.photoUrl = safe;
        }
      }
      for (const entry of annex.weekBirthdays) {
        if (entry.kind === "member") {
          entry.photoUrl = safe;
        }
      }
    } else {
      // Conversion failed → disable photos rather than risk crash
      annex.showMemberPhotos = false;
      for (const group of annex.memberGroups) {
        for (const person of group.people) {
          person.photoUrl = undefined;
        }
      }
    }
  }

  return {
    club: {
      name: stripNullBytes(minute.club.name) ?? minute.club.name,
      address:
        stripNullBytes(minute.club.address ?? minute.club.meetingLocation) ??
        undefined,
      logoUrl: isPdfSafeImageSrc(logoUrl) ? logoUrl : undefined,
      logoIsGenerated: !isPdfSafeImageSrc(logoUrl),
      logoAspectRatio,
    },
    meeting: {
      date: format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale }),
      location: stripNullBytes(minute.meeting.location) ?? undefined,
      type: stripNullBytes(minute.meeting.type) ?? minute.meeting.type,
      presidedBy: stripNullBytes(minute.meeting.presidedBy) ?? undefined,
      secretary: stripNullBytes(minute.meeting.secretary) ?? undefined,
    },
    title: stripNullBytes(minute.title) ?? minute.title,
    attendances: { present, absent: total - present, rate },
    agendaItems: minute.agendaItems.map((item) => ({
      title: stripNullBytes(item.title) ?? item.title,
      description: stripNullBytes(item.description),
      decisions: stripNullBytes(item.decisions),
      actions: stripNullBytes(item.actions),
    })),
    hash,
    qrCodeDataUrl,
    verifyUrl,
    annex,
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

/**
 * Build PDF with progressive fallbacks so users almost never get a hard 500.
 * 1) Full (shared avatar thumbs if photos enabled)
 * 2) No photos
 * 3) No custom logo + no photos
 * 4) Text-only (no logo/QR/photos) — last resort against react-pdf image crashes
 */
export async function buildMinutePdfBuffer(
  minute: MinuteForPdf,
  locale: string
): Promise<{ buffer: Buffer; filename: string }> {
  const filename = minutePdfFilename(minute);
  const attempts: PdfBuildOptions[] = [
    { embedPhotos: true, skipCustomLogo: false },
    { embedPhotos: false, skipCustomLogo: false },
    { embedPhotos: false, skipCustomLogo: true },
    { stripAllImages: true },
  ];

  let lastError: unknown;
  for (const opts of attempts) {
    try {
      const data = await buildMinutePdfData(minute, locale, opts);
      const buffer = await renderMinutePdf(data);
      if (!buffer?.length) throw new Error("EMPTY_PDF_BUFFER");
      return { buffer, filename };
    } catch (e) {
      lastError = e;
      console.warn(
        "[buildMinutePdfBuffer] attempt failed",
        opts,
        e instanceof Error ? e.message : e
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("PDF_GENERATION_FAILED");
}
