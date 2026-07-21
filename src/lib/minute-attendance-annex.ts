import { excludeHonoraryMemberAttendances } from "@/lib/member-attendance-eligibility";
import {
  formatGuestName,
  formatFirstName,
  formatLastName,
  formatPersonName,
} from "@/lib/format-person-name";
import { isDataUrl } from "@/lib/image-storage";
import { MEMBER_DEFAULT_AVATAR_PATH } from "@/lib/media-url";

/** Build attendance & visitor lists for minute annex (PV). */

export const MEMBER_ATTENDANCE_CATEGORIES = [
  "PRESENT",
  "EXCUSED_ABSENT",
  "UNEXCUSED_ABSENT",
  "TRAVELING",
  "TRAVEL_RETURN",
  "BIRTHDAY",
  "EXTERNAL_ATTENDANCE",
] as const;

export const GUEST_ATTENDANCE_CATEGORIES = [
  "ROTARY_GUEST",
  "ROTARACT_GUEST",
  "NON_ROTARY_GUEST",
  "SPEAKER",
  "VISITOR",
] as const;

export type MinuteAttendanceRow = {
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
};

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  PRESENT: { fr: "Présent", en: "Present" },
  EXCUSED_ABSENT: { fr: "Excusé", en: "Excused" },
  UNEXCUSED_ABSENT: { fr: "Non excusé", en: "Unexcused" },
  TRAVELING: { fr: "En voyage", en: "Traveling" },
  TRAVEL_RETURN: { fr: "Retour de voyage", en: "Travel return" },
  BIRTHDAY: { fr: "Anniversaire", en: "Birthday" },
  EXTERNAL_ATTENDANCE: { fr: "Participation externe", en: "External attendance" },
  ROTARY_GUEST: { fr: "Invité rotarien", en: "Rotary guest" },
  ROTARACT_GUEST: { fr: "Invité rotaractien", en: "Rotaract guest" },
  NON_ROTARY_GUEST: { fr: "Invité non rotarien", en: "Non-Rotary guest" },
  SPEAKER: { fr: "Conférencier", en: "Speaker" },
  VISITOR: { fr: "Visiteur", en: "Visitor" },
};

export function attendanceCategoryLabel(category: string, locale: string): string {
  const labels = CATEGORY_LABELS[category];
  if (!labels) return category;
  return locale === "en" ? labels.en : labels.fr;
}

/** Annex display: "Prénom NOM" (uniform casing). */
export function attendanceDisplayName(row: MinuteAttendanceRow): string {
  if (row.member) {
    return formatPersonName(row.member.firstName, row.member.lastName) || "—";
  }
  return formatGuestName(row.guestName) || "—";
}

/**
 * Photo for annex row when club shows member photos.
 * - Web: custom photo URL/data or public default path (no Node fs — client-safe).
 * - PDF (`preferDataUrlOnly`): only custom data: URLs; missing photos stay null
 *   and are filled with the default avatar data URL in build-minute-pdf (server).
 */
export function annexMemberPhotoSrc(
  row: MinuteAttendanceRow,
  options?: { preferDataUrlOnly?: boolean }
): string | null {
  const photo = row.member?.photoUrl?.trim();
  if (photo) {
    if (options?.preferDataUrlOnly) {
      return isDataUrl(photo) ? photo : null;
    }
    return photo;
  }
  if (options?.preferDataUrlOnly) {
    return null;
  }
  return MEMBER_DEFAULT_AVATAR_PATH;
}

/** Sort by nom then prénom for stable annex lists. */
function sortByName(a: MinuteAttendanceRow, b: MinuteAttendanceRow): number {
  if (a.member && b.member) {
    const byLast = formatLastName(a.member.lastName).localeCompare(
      formatLastName(b.member.lastName),
      "fr",
      { sensitivity: "base" }
    );
    if (byLast !== 0) return byLast;
    return formatFirstName(a.member.firstName).localeCompare(
      formatFirstName(b.member.firstName),
      "fr",
      { sensitivity: "base" }
    );
  }
  return attendanceDisplayName(a).localeCompare(attendanceDisplayName(b), "fr", {
    sensitivity: "base",
  });
}

export type AnnexPersonEntry = {
  name: string;
  /** Data URL or absolute URL for thumbnail (optional). */
  photoUrl?: string | null;
  memberId?: string | null;
};

export type AttendanceAnnexGroup = {
  category: string;
  label: string;
  /** @deprecated use people — kept for text summaries */
  names: string[];
  people: AnnexPersonEntry[];
};

export type VisitorAnnexRow = {
  name: string;
  category: string;
  label: string;
};

export type MinuteAttendanceAnnex = {
  memberGroups: AttendanceAnnexGroup[];
  visitors: VisitorAnnexRow[];
  totalMembers: number;
  totalVisitors: number;
  showMemberPhotos: boolean;
};

export function buildMinuteAttendanceAnnex(
  rows: MinuteAttendanceRow[],
  locale: string,
  options?: {
    showMemberPhotos?: boolean;
    /** When true (PDF), only embed photos stored as data: URLs. */
    preferDataUrlOnly?: boolean;
  }
): MinuteAttendanceAnnex {
  const showMemberPhotos = !!options?.showMemberPhotos;
  const countableRows = excludeHonoraryMemberAttendances(rows);
  const memberRows = countableRows.filter((r) =>
    (MEMBER_ATTENDANCE_CATEGORIES as readonly string[]).includes(r.category)
  );
  const guestRows = countableRows.filter((r) =>
    (GUEST_ATTENDANCE_CATEGORIES as readonly string[]).includes(r.category)
  );

  const memberGroups: AttendanceAnnexGroup[] = [];
  for (const category of MEMBER_ATTENDANCE_CATEGORIES) {
    const inCategory = memberRows.filter((r) => r.category === category).sort(sortByName);
    if (inCategory.length === 0) continue;
    const people: AnnexPersonEntry[] = inCategory.map((r) => ({
      name: attendanceDisplayName(r),
      memberId: r.memberId ?? r.member?.id ?? null,
      photoUrl: showMemberPhotos
        ? annexMemberPhotoSrc(r, {
            preferDataUrlOnly: options?.preferDataUrlOnly,
          })
        : null,
    }));
    memberGroups.push({
      category,
      label: attendanceCategoryLabel(category, locale),
      names: people.map((p) => p.name),
      people,
    });
  }

  const visitors = guestRows
    .sort(sortByName)
    .map((r) => ({
      name: attendanceDisplayName(r),
      category: r.category,
      label: attendanceCategoryLabel(r.category, locale),
    }));

  return {
    memberGroups,
    visitors,
    totalMembers: memberRows.length,
    totalVisitors: visitors.length,
    showMemberPhotos,
  };
}

/** Column-first split (read top→bottom, then next column) for compact name lists. */
export function splitIntoColumns<T>(items: T[], columns: number): T[][] {
  const colCount = Math.max(1, Math.min(columns, items.length || 1));
  if (items.length === 0) return Array.from({ length: colCount }, () => []);
  const cols: T[][] = Array.from({ length: colCount }, () => []);
  const perCol = Math.ceil(items.length / colCount);
  for (let i = 0; i < items.length; i++) {
    const col = Math.min(Math.floor(i / perCol), colCount - 1);
    cols[col].push(items[i]);
  }
  return cols;
}

/** Adaptive columns: short lists stay single-column; long lists use 2–3 cols. */
export function annexColumnCount(itemCount: number, withPhotos = false): number {
  if (withPhotos) {
    if (itemCount <= 10) return 1;
    if (itemCount <= 28) return 2;
    return 3;
  }
  if (itemCount <= 8) return 1;
  if (itemCount <= 24) return 2;
  return 3;
}
