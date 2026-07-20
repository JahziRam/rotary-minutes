import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  getMonth,
} from "date-fns";

/** Rotary mandate: July 1 → June 30 */
export function getRotaryMandateYear(date: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const year = date.getFullYear();
  const month = getMonth(date); // 0-indexed; June = 5

  const mandateStartYear = month >= 6 ? year : year - 1;
  const start = new Date(mandateStartYear, 6, 1); // July 1
  const end = new Date(mandateStartYear + 1, 5, 30, 23, 59, 59); // June 30

  return {
    start,
    end,
    label: `${mandateStartYear}-${mandateStartYear + 1}`,
  };
}

export function isInRotaryMandate(date: Date, reference: Date = new Date()): boolean {
  const { start, end } = getRotaryMandateYear(reference);
  return isWithinInterval(date, { start, end });
}

export interface AttendanceStats {
  present: number;
  absent: number;
  total: number;
  rate: number;
}

export function calculateAttendanceRate(
  present: number,
  total: number
): AttendanceStats {
  const absent = total - present;
  const rate = total > 0 ? (present / total) * 100 : 0;
  return { present, absent, total, rate };
}

/**
 * Categories that count as "present" for attendance rate.
 * TRAVEL_RETURN (retour de voyage) counts as present, same as PRESENT.
 */
export const ATTENDANCE_PRESENT_CATEGORIES = new Set([
  "PRESENT",
  "TRAVEL_RETURN",
  "EXTERNAL_ATTENDANCE",
  "TRAVELING",
]);

export function isAttendancePresent(category: string): boolean {
  return ATTENDANCE_PRESENT_CATEGORIES.has(category);
}

/**
 * Taux basé sur les présences enregistrées (liste réunions, PV).
 * Only club members count — guests and honorary members (via excludeMemberIds) are out.
 */
export function computeRecordedAttendanceRate(
  attendances: Array<{
    category: string;
    memberId?: string | null;
    member?: { isHonoraryMember?: boolean } | null;
  }>,
  excludeMemberIds?: ReadonlySet<string>
): number | null {
  const countable = attendances.filter((a) => {
    if (!a.memberId) return false;
    if (a.member?.isHonoraryMember) return false;
    if (excludeMemberIds?.has(a.memberId)) return false;
    return true;
  });
  if (countable.length === 0) return null;
  const present = countable.filter((a) => isAttendancePresent(a.category)).length;
  return Math.round(calculateAttendanceRate(present, countable.length).rate);
}

export function countPresentAttendances(
  attendances: Array<{
    category: string;
    memberId?: string | null;
    member?: { isHonoraryMember?: boolean } | null;
  }>,
  excludeMemberIds?: ReadonlySet<string>
): number {
  const countable = attendances.filter((a) => {
    if (!a.memberId) return false;
    if (a.member?.isHonoraryMember) return false;
    if (excludeMemberIds?.has(a.memberId)) return false;
    return true;
  });
  return countable.filter((a) => isAttendancePresent(a.category)).length;
}

/** Taux en direct : présents / membres actifs du club. */
export function computeLiveAttendanceRate(
  present: number,
  memberCount: number
): number {
  if (memberCount === 0) return 0;
  return Math.round(calculateAttendanceRate(present, memberCount).rate);
}

/** Rotary International attendance expectation for active members. */
export const ROTARY_ATTENDANCE_GOAL = 75;

export const MEETING_TYPE_FIELDS: Record<string, string[]> = {
  COMMISSION: ["commissionName"],
  JOINT_MEETING: ["partnerClubs"],
  GOVERNOR_VISIT: ["governor", "adg", "officialGuests"],
};

export const CLUB_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "PROTOCOL",
  "TREASURER",
  "FOUNDATION_CHAIR",
  "MEMBERSHIP_CHAIR",
  "COMMISSION_CHAIR",
  "PUBLIC_IMAGE_CHAIR",
  "ADMIN",
  "READER",
] as const;

export type ClubRoleType = (typeof CLUB_ROLES)[number];