export type ContextualHintId =
  | "minute_editor_intro"
  | "minute_editor_workflow"
  | "minute_editor_agenda"
  | "minute_finalize_action"
  | "minute_submit_action"
  | "live_meeting_intro"
  | "live_attendance"
  | "dashboard_missions"
  | "emails_intro"
  | "emails_compose_action"
  | "calendar_intro"
  | "calendar_export_action"
  | "events_intro"
  | "events_create_action"
  | "settings_intro"
  | "settings_guide_action"
  | "attendance_intro"
  | "attendance_export_action"
  | "profile_intro"
  | "profile_save_action"
  | "dues_intro"
  | "dues_record_action";

export type ContextualHintDef = {
  id: ContextualHintId;
  helpAnchor: string;
  /** When set, hint is an action hint pointing at data-assist target */
  actionTarget?: string;
  variant?: "banner" | "action";
};

export const CONTEXTUAL_HINTS: Record<ContextualHintId, ContextualHintDef> = {
  minute_editor_intro: { id: "minute_editor_intro", helpAnchor: "minutes", variant: "banner" },
  minute_editor_workflow: { id: "minute_editor_workflow", helpAnchor: "minutes", variant: "banner" },
  minute_editor_agenda: { id: "minute_editor_agenda", helpAnchor: "minutes", variant: "banner" },
  minute_finalize_action: {
    id: "minute_finalize_action",
    helpAnchor: "minutes",
    actionTarget: "minute-finalize-btn",
    variant: "action",
  },
  minute_submit_action: {
    id: "minute_submit_action",
    helpAnchor: "minutes",
    actionTarget: "minute-submit-review",
    variant: "action",
  },
  live_meeting_intro: { id: "live_meeting_intro", helpAnchor: "meetings", variant: "banner" },
  live_attendance: { id: "live_attendance", helpAnchor: "meetings", variant: "banner" },
  dashboard_missions: { id: "dashboard_missions", helpAnchor: "getting-started", variant: "banner" },
  emails_intro: { id: "emails_intro", helpAnchor: "emails", variant: "banner" },
  emails_compose_action: {
    id: "emails_compose_action",
    helpAnchor: "emails",
    actionTarget: "emails-compose-link",
    variant: "action",
  },
  calendar_intro: { id: "calendar_intro", helpAnchor: "meetings", variant: "banner" },
  calendar_export_action: {
    id: "calendar_export_action",
    helpAnchor: "meetings",
    actionTarget: "calendar-export",
    variant: "action",
  },
  events_intro: { id: "events_intro", helpAnchor: "meetings", variant: "banner" },
  events_create_action: {
    id: "events_create_action",
    helpAnchor: "meetings",
    actionTarget: "events-new-btn",
    variant: "action",
  },
  settings_intro: { id: "settings_intro", helpAnchor: "getting-started", variant: "banner" },
  settings_guide_action: {
    id: "settings_guide_action",
    helpAnchor: "getting-started",
    actionTarget: "settings-club-tab",
    variant: "action",
  },
  attendance_intro: { id: "attendance_intro", helpAnchor: "meetings", variant: "banner" },
  attendance_export_action: {
    id: "attendance_export_action",
    helpAnchor: "meetings",
    actionTarget: "attendance-export",
    variant: "action",
  },
  profile_intro: { id: "profile_intro", helpAnchor: "getting-started", variant: "banner" },
  profile_save_action: {
    id: "profile_save_action",
    helpAnchor: "getting-started",
    actionTarget: "profile-save",
    variant: "action",
  },
  dues_intro: { id: "dues_intro", helpAnchor: "dues", variant: "banner" },
  dues_record_action: {
    id: "dues_record_action",
    helpAnchor: "dues",
    actionTarget: "dues-record-payment",
    variant: "action",
  },
};

export type EmptyStateKey =
  | "meetings"
  | "minutes"
  | "members"
  | "treasury"
  | "emails"
  | "calendar"
  | "events"
  | "settings"
  | "attendance"
  | "profile"
  | "dues"
  | "dashboard_meetings"
  | "dashboard_minutes"
  | "live_no_minute";

export const EMPTY_STATE_HELP: Record<EmptyStateKey, string> = {
  meetings: "meetings",
  minutes: "minutes",
  members: "dues",
  treasury: "dues",
  emails: "emails",
  calendar: "meetings",
  events: "meetings",
  settings: "getting-started",
  attendance: "meetings",
  profile: "getting-started",
  dues: "dues",
  dashboard_meetings: "meetings",
  dashboard_minutes: "minutes",
  live_no_minute: "minutes",
};