import type { MissionKey } from "@/lib/assistance/missions";

export type WalkthroughFlowId =
  | "create_meeting"
  | "live_meeting"
  | "finalize_minute"
  | "send_email"
  | "explore_calendar"
  | "create_event"
  | "configure_settings"
  | "review_attendance"
  | "update_profile"
  | "manage_dues";

export type WalkthroughStep = {
  /** Matches `data-assist` on page elements */
  target: string;
  titleKey: string;
  bodyKey: string;
};

export const WALKTHROUGH_FLOWS: Record<WalkthroughFlowId, WalkthroughStep[]> = {
  create_meeting: [
    { target: "meeting-form-date", titleKey: "date", bodyKey: "date" },
    { target: "meeting-form-type", titleKey: "type", bodyKey: "type" },
    { target: "meeting-form-location", titleKey: "location", bodyKey: "location" },
    { target: "meeting-form-submit", titleKey: "submit", bodyKey: "submit" },
  ],
  live_meeting: [
    { target: "live-attendance-panel", titleKey: "attendance", bodyKey: "attendance" },
    { target: "live-minute-panel", titleKey: "minute", bodyKey: "minute" },
  ],
  finalize_minute: [
    { target: "minute-editor-content", titleKey: "content", bodyKey: "content" },
    { target: "minute-submit-review", titleKey: "submit", bodyKey: "submit" },
    { target: "minute-finalize-btn", titleKey: "finalize", bodyKey: "finalize" },
  ],
  send_email: [
    { target: "emails-compose-link", titleKey: "compose", bodyKey: "compose" },
    { target: "emails-templates-link", titleKey: "templates", bodyKey: "templates" },
  ],
  explore_calendar: [
    { target: "calendar-month-nav", titleKey: "nav", bodyKey: "nav" },
    { target: "calendar-export", titleKey: "export", bodyKey: "export" },
  ],
  create_event: [
    { target: "events-new-btn", titleKey: "new", bodyKey: "new" },
    { target: "events-list", titleKey: "list", bodyKey: "list" },
  ],
  configure_settings: [
    { target: "settings-club-tab", titleKey: "club", bodyKey: "club" },
    { target: "settings-workflow-tab", titleKey: "workflow", bodyKey: "workflow" },
  ],
  review_attendance: [
    { target: "attendance-overview", titleKey: "overview", bodyKey: "overview" },
    { target: "attendance-export", titleKey: "export", bodyKey: "export" },
  ],
  update_profile: [
    { target: "profile-info", titleKey: "info", bodyKey: "info" },
    { target: "profile-save", titleKey: "save", bodyKey: "save" },
  ],
  manage_dues: [
    { target: "dues-overview", titleKey: "overview", bodyKey: "overview" },
    { target: "dues-record-payment", titleKey: "payment", bodyKey: "payment" },
  ],
};

export const MISSION_WALKTHROUGH_MAP: Partial<Record<MissionKey, WalkthroughFlowId>> = {
  schedule_meeting: "create_meeting",
  run_live_meeting: "live_meeting",
  draft_minute: "finalize_minute",
  finalize_minute: "finalize_minute",
  record_dues: "manage_dues",
  send_email: "send_email",
  explore_calendar: "explore_calendar",
  create_event: "create_event",
  configure_settings: "configure_settings",
  review_attendance: "review_attendance",
  update_profile: "update_profile",
};

export const CRITICAL_WALKTHROUGHS: WalkthroughFlowId[] = [
  "create_meeting",
  "live_meeting",
  "finalize_minute",
];

export function getWalkthroughSteps(flowId: WalkthroughFlowId): WalkthroughStep[] {
  return WALKTHROUGH_FLOWS[flowId] ?? [];
}

export function getWalkthroughForMission(missionKey: MissionKey): WalkthroughFlowId | null {
  return MISSION_WALKTHROUGH_MAP[missionKey] ?? null;
}

export type WalkthroughState = {
  activeFlow?: WalkthroughFlowId;
  stepIndex?: number;
  completedFlows?: WalkthroughFlowId[];
};

export function parseWalkthroughState(raw: unknown): WalkthroughState {
  if (!raw || typeof raw !== "object") return {};
  const s = raw as WalkthroughState;
  return {
    activeFlow: s.activeFlow,
    stepIndex: typeof s.stepIndex === "number" ? s.stepIndex : 0,
    completedFlows: Array.isArray(s.completedFlows) ? s.completedFlows : [],
  };
}