import { excludeHonoraryMemberAttendances } from "@/lib/member-attendance-eligibility";

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
  member?: { firstName: string; lastName: string; isHonoraryMember?: boolean } | null;
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

export function attendanceDisplayName(row: MinuteAttendanceRow): string {
  if (row.member) {
    return `${row.member.firstName} ${row.member.lastName}`.trim();
  }
  return row.guestName?.trim() || "—";
}

function sortByName(a: MinuteAttendanceRow, b: MinuteAttendanceRow): number {
  return attendanceDisplayName(a).localeCompare(attendanceDisplayName(b), "fr", {
    sensitivity: "base",
  });
}

export type AttendanceAnnexGroup = {
  category: string;
  label: string;
  names: string[];
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
};

export function buildMinuteAttendanceAnnex(
  rows: MinuteAttendanceRow[],
  locale: string
): MinuteAttendanceAnnex {
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
    memberGroups.push({
      category,
      label: attendanceCategoryLabel(category, locale),
      names: inCategory.map(attendanceDisplayName),
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
  };
}