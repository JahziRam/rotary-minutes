export const ASSISTANCE_EVENT_TYPES = {
  GUIDE_STARTED: "guide_started",
  GUIDE_STEP_VIEW: "guide_step_view",
  GUIDE_STEP_ABANDON: "guide_step_abandon",
  GUIDE_COMPLETED: "guide_completed",
  GUIDE_DISMISSED: "guide_dismissed",
  HINT_VIEW: "hint_view",
  HINT_DISMISSED: "hint_dismissed",
  MISSION_STARTED: "mission_started",
  MISSION_WALKTHROUGH_STEP: "mission_walkthrough_step",
  MISSION_COMPLETED: "mission_completed",
  WALKTHROUGH_STARTED: "walkthrough_started",
  WALKTHROUGH_STEP: "walkthrough_step",
  WALKTHROUGH_COMPLETED: "walkthrough_completed",
  WALKTHROUGH_ABANDONED: "walkthrough_abandoned",
  COACH_TIP_VIEW: "coach_tip_view",
  FEEDBACK_SUBMITTED: "feedback_submitted",
} as const;

export type AssistanceEventType =
  (typeof ASSISTANCE_EVENT_TYPES)[keyof typeof ASSISTANCE_EVENT_TYPES];

export type AssistanceAnalyticsSummary = {
  guideStarted: number;
  guideCompleted: number;
  guideDismissed: number;
  guideAbandoned: number;
  guideCompletionRate: number;
  walkthroughsStarted: number;
  walkthroughsCompleted: number;
  walkthroughsAbandoned: number;
  missionsStarted: number;
  missionsCompleted: number;
  hintsDismissed: Record<string, number>;
  feedbackCount: number;
  avgFeedbackRating: number;
  stepAbandonment: Record<string, number>;
};

export function computeGuideCompletionRate(completed: number, started: number): number {
  if (started <= 0) return 0;
  return Math.round((completed / started) * 100);
}

export function aggregateHintDismissals(
  events: { eventType: string; payload: unknown }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    if (e.eventType !== ASSISTANCE_EVENT_TYPES.HINT_DISMISSED) continue;
    const hintId =
      typeof e.payload === "object" &&
      e.payload !== null &&
      "hintId" in e.payload &&
      typeof (e.payload as { hintId: unknown }).hintId === "string"
        ? (e.payload as { hintId: string }).hintId
        : "unknown";
    counts[hintId] = (counts[hintId] ?? 0) + 1;
  }
  return counts;
}

export function aggregateStepAbandonment(
  events: { eventType: string; payload: unknown }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    if (e.eventType !== ASSISTANCE_EVENT_TYPES.GUIDE_STEP_ABANDON) continue;
    const step =
      typeof e.payload === "object" &&
      e.payload !== null &&
      "step" in e.payload &&
      typeof (e.payload as { step: unknown }).step === "string"
        ? (e.payload as { step: string }).step
        : "unknown";
    counts[step] = (counts[step] ?? 0) + 1;
  }
  return counts;
}