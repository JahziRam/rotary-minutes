/**
 * Temporary maintenance window for Meetings + Minutes (PV).
 * Blocks UI and server actions until this instant (exclusive end).
 *
 * End: Monday 27 July 2026, 12:00 GMT+3 (= 09:00 UTC).
 */
export const MEETINGS_MINUTES_MAINTENANCE_UNTIL = new Date(
  "2026-07-27T09:00:00.000Z"
);

/** Human-readable end for banners (fixed, as announced to clubs). */
export const MEETINGS_MINUTES_MAINTENANCE_UNTIL_LABEL = {
  fr: "lundi 27 juillet 2026 à 12:00 (GMT+3)",
  en: "Monday 27 July 2026 at 12:00 (GMT+3)",
  es: "lunes 27 de julio de 2026 a las 12:00 (GMT+3)",
} as const;

export function isMeetingsMinutesMaintenanceActive(
  now: Date = new Date()
): boolean {
  return now.getTime() < MEETINGS_MINUTES_MAINTENANCE_UNTIL.getTime();
}

export function meetingsMinutesMaintenanceUntilLabel(
  locale: string
): string {
  if (locale === "en") return MEETINGS_MINUTES_MAINTENANCE_UNTIL_LABEL.en;
  if (locale === "es") return MEETINGS_MINUTES_MAINTENANCE_UNTIL_LABEL.es;
  return MEETINGS_MINUTES_MAINTENANCE_UNTIL_LABEL.fr;
}

/** For server actions: return a stable error code when maintenance is on. */
export function assertMeetingsMinutesAvailable():
  | { error: "MAINTENANCE" }
  | null {
  if (isMeetingsMinutesMaintenanceActive()) {
    return { error: "MAINTENANCE" as const };
  }
  return null;
}
