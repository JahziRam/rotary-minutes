import {
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { enUS, es, fr } from "date-fns/locale";
import { excludeHonoraryMemberAttendances } from "@/lib/member-attendance-eligibility";
import {
  formatGuestName,
  formatFirstName,
  formatLastName,
  formatPersonName,
} from "@/lib/format-person-name";
import { isDataUrl } from "@/lib/image-storage";
import { MEMBER_DEFAULT_AVATAR_PATH } from "@/lib/media-url";
import {
  annexColumnCountForPhotos,
  DEFAULT_MINUTE_MEMBER_PHOTO_SIZE,
  parseMinuteMemberPhotoSize,
  type MinuteMemberPhotoSize,
} from "@/lib/minute-member-photo-size";

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

/** Active club members used to compute week birthdays (members + spouses). */
export type BirthdayMemberSource = {
  id: string;
  firstName: string;
  lastName: string;
  birthday?: Date | string | null;
  spouseFirstName?: string | null;
  spouseLastName?: string | null;
  spouseBirthday?: Date | string | null;
  photoUrl?: string | null;
};

export type WeekBirthdayEntry = {
  name: string;
  kind: "member" | "spouse";
  /** Display date of the birthday this week (e.g. "15 mars"). */
  dateLabel: string;
  /** For spouses: related member display name. */
  relatedMemberName?: string;
  /** Kind label for secondary column (Member / Spouse of …). */
  kindLabel: string;
  photoUrl?: string | null;
  memberId?: string | null;
};

export type MinuteAttendanceAnnex = {
  memberGroups: AttendanceAnnexGroup[];
  visitors: VisitorAnnexRow[];
  /** Birthdays of members and spouses falling in the meeting's calendar week. */
  weekBirthdays: WeekBirthdayEntry[];
  totalMembers: number;
  totalVisitors: number;
  showMemberPhotos: boolean;
  /** Profile photo size when showMemberPhotos is true. */
  memberPhotoSize: MinuteMemberPhotoSize;
};

function dateLocaleFor(locale: string) {
  if (locale === "en") return enUS;
  if (locale === "es") return es;
  return fr;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Occurrence of a birthday (month/day) that falls within [weekStart, weekEnd].
 * Handles weeks that span two calendar years (late Dec / early Jan).
 */
export function birthdayOccurrenceInWeek(
  birthday: Date,
  weekStart: Date,
  weekEnd: Date
): Date | null {
  const start = startOfDay(weekStart);
  const end = endOfDay(weekEnd);
  const years = Array.from(
    new Set([start.getFullYear(), end.getFullYear()])
  );
  for (const year of years) {
    // Guard invalid dates (e.g. 29 Feb on non-leap years → rolls to Mar 1 in JS)
    const occurrence = new Date(year, birthday.getMonth(), birthday.getDate());
    if (
      occurrence.getMonth() !== birthday.getMonth() ||
      occurrence.getDate() !== birthday.getDate()
    ) {
      continue;
    }
    if (occurrence >= start && occurrence <= end) return occurrence;
  }
  return null;
}

/** Monday–Sunday week containing the meeting (ISO-style, week starts Monday). */
export function meetingWeekRange(meetingDate: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(meetingDate, { weekStartsOn: 1 }),
    end: endOfWeek(meetingDate, { weekStartsOn: 1 }),
  };
}

function memberPhotoForBirthday(
  member: BirthdayMemberSource,
  options?: { showMemberPhotos?: boolean; preferDataUrlOnly?: boolean }
): string | null {
  if (!options?.showMemberPhotos) return null;
  const photo = member.photoUrl?.trim();
  if (photo) {
    if (options.preferDataUrlOnly) {
      return isDataUrl(photo) ? photo : null;
    }
    return photo;
  }
  if (options.preferDataUrlOnly) return null;
  return MEMBER_DEFAULT_AVATAR_PATH;
}

/**
 * Members and spouses whose birthday falls in the calendar week of the meeting.
 * Sorted by birthday date, then name.
 */
export function collectWeekBirthdays(
  members: BirthdayMemberSource[],
  meetingDate: Date,
  locale: string,
  options?: {
    showMemberPhotos?: boolean;
    preferDataUrlOnly?: boolean;
  }
): WeekBirthdayEntry[] {
  const { start, end } = meetingWeekRange(meetingDate);
  const dateLoc = dateLocaleFor(locale);
  const isFr = locale !== "en" && locale !== "es";
  const isEs = locale === "es";
  const entries: Array<WeekBirthdayEntry & { sortKey: number }> = [];

  for (const member of members) {
    const memberName = formatPersonName(member.firstName, member.lastName) || "—";

    const memberBday = toDate(member.birthday);
    if (memberBday) {
      const occurrence = birthdayOccurrenceInWeek(memberBday, start, end);
      if (occurrence) {
        entries.push({
          name: memberName,
          kind: "member",
          dateLabel: format(occurrence, "d MMMM", { locale: dateLoc }),
          kindLabel: isFr ? "Membre" : isEs ? "Miembro" : "Member",
          photoUrl: memberPhotoForBirthday(member, options),
          memberId: member.id,
          sortKey: occurrence.getTime(),
        });
      }
    }

    const spouseBday = toDate(member.spouseBirthday);
    if (spouseBday) {
      const occurrence = birthdayOccurrenceInWeek(spouseBday, start, end);
      if (occurrence) {
        const spouseOwnName = formatPersonName(
          member.spouseFirstName,
          member.spouseLastName
        );
        const spouseOfLabel = isFr
          ? `Conjoint de ${memberName}`
          : isEs
            ? `Cónyuge de ${memberName}`
            : `Spouse of ${memberName}`;
        entries.push({
          name: spouseOwnName || spouseOfLabel,
          kind: "spouse",
          dateLabel: format(occurrence, "d MMMM", { locale: dateLoc }),
          relatedMemberName: memberName,
          // Avoid "Conjoint de X — Conjoint de X" when spouse name is missing.
          kindLabel: spouseOwnName ? spouseOfLabel : isFr ? "Conjoint" : isEs ? "Cónyuge" : "Spouse",
          photoUrl: null,
          memberId: member.id,
          sortKey: occurrence.getTime(),
        });
      }
    }
  }

  entries.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });

  return entries.map(({ sortKey: _s, ...entry }) => entry);
}

export function buildMinuteAttendanceAnnex(
  rows: MinuteAttendanceRow[],
  locale: string,
  options?: {
    showMemberPhotos?: boolean;
    memberPhotoSize?: string | null;
    /** When true (PDF), only embed photos stored as data: URLs. */
    preferDataUrlOnly?: boolean;
    /** Meeting date used for “birthdays of the week”. */
    meetingDate?: Date | string | null;
    /** Active club members (with birthday / spouseBirthday) for the week list. */
    birthdayMembers?: BirthdayMemberSource[];
  }
): MinuteAttendanceAnnex {
  const showMemberPhotos = !!options?.showMemberPhotos;
  const memberPhotoSize = showMemberPhotos
    ? parseMinuteMemberPhotoSize(options?.memberPhotoSize)
    : DEFAULT_MINUTE_MEMBER_PHOTO_SIZE;
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

  const meetingDate = toDate(options?.meetingDate ?? null);
  const weekBirthdays =
    meetingDate && options?.birthdayMembers?.length
      ? collectWeekBirthdays(options.birthdayMembers, meetingDate, locale, {
          showMemberPhotos,
          preferDataUrlOnly: options.preferDataUrlOnly,
        })
      : [];

  return {
    memberGroups,
    visitors,
    weekBirthdays,
    totalMembers: memberRows.length,
    totalVisitors: visitors.length,
    showMemberPhotos,
    memberPhotoSize,
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

/**
 * Adaptive columns: short lists stay single-column; long lists use 2–3 cols.
 * Larger photos use slightly fewer columns.
 */
export function annexColumnCount(
  itemCount: number,
  withPhotos = false,
  photoSize: MinuteMemberPhotoSize = DEFAULT_MINUTE_MEMBER_PHOTO_SIZE
): number {
  return annexColumnCountForPhotos(itemCount, withPhotos, photoSize);
}
