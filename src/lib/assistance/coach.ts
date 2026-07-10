import type { MissionKey } from "@/lib/assistance/missions";

export type CoachWeek = 1 | 2 | 3 | 4;

export type CoachTipKey =
  | "week1_meetings"
  | "week1_minutes"
  | "week2_members"
  | "week2_dues"
  | "week3_treasury"
  | "week4_emails"
  | "week4_calendar"
  | "week4_events"
  | "week4_attendance"
  | "week4_profile";

type CoachEntry = { week: CoachWeek; key: CoachTipKey; dayMin: number };

const COACH_SCHEDULE: CoachEntry[] = [
  { week: 1, key: "week1_meetings", dayMin: 0 },
  { week: 1, key: "week1_minutes", dayMin: 3 },
  { week: 2, key: "week2_members", dayMin: 7 },
  { week: 2, key: "week2_dues", dayMin: 10 },
  { week: 3, key: "week3_treasury", dayMin: 14 },
  { week: 4, key: "week4_emails", dayMin: 21 },
  { week: 4, key: "week4_calendar", dayMin: 24 },
  { week: 4, key: "week4_events", dayMin: 26 },
  { week: 4, key: "week4_attendance", dayMin: 28 },
  { week: 4, key: "week4_profile", dayMin: 30 },
];

/** Action-aware coach: surfaces the next relevant tip from mission gaps, then calendar fallback */
const MISSION_COACH_PRIORITY: { mission: MissionKey; tip: CoachTipKey }[] = [
  { mission: "schedule_meeting", tip: "week1_meetings" },
  { mission: "run_live_meeting", tip: "week1_minutes" },
  { mission: "draft_minute", tip: "week1_minutes" },
  { mission: "add_members", tip: "week2_members" },
  { mission: "record_dues", tip: "week2_dues" },
  { mission: "treasury_entry", tip: "week3_treasury" },
  { mission: "send_email", tip: "week4_emails" },
  { mission: "explore_calendar", tip: "week4_calendar" },
  { mission: "create_event", tip: "week4_events" },
  { mission: "review_attendance", tip: "week4_attendance" },
  { mission: "update_profile", tip: "week4_profile" },
];

export function getCoachTip(
  coachStartedAt: Date | null,
  missionProgress?: Partial<Record<MissionKey, boolean>>
): { week: CoachWeek; key: CoachTipKey } | null {
  if (!coachStartedAt) return null;
  const days = Math.floor(
    (Date.now() - coachStartedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days > 30) return null;

  if (missionProgress) {
    for (const { mission, tip } of MISSION_COACH_PRIORITY) {
      if (!missionProgress[mission]) {
        const entry = COACH_SCHEDULE.find((e) => e.key === tip);
        if (entry && days >= entry.dayMin) {
          return { week: entry.week, key: tip };
        }
      }
    }
  }

  let current = COACH_SCHEDULE[0]!;
  for (const entry of COACH_SCHEDULE) {
    if (days >= entry.dayMin) current = entry;
  }
  return { week: current.week, key: current.key };
}