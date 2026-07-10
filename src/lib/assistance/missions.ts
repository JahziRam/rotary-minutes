export type AssistanceFocusRole = "SECRETARY" | "TREASURER" | "PRESIDENT" | "READER";

export type MissionKey =
  | "schedule_meeting"
  | "run_live_meeting"
  | "draft_minute"
  | "finalize_minute"
  | "add_members"
  | "record_dues"
  | "treasury_entry"
  | "invite_team"
  | "send_email"
  | "explore_calendar"
  | "create_event"
  | "configure_settings"
  | "review_attendance"
  | "update_profile";

export type MissionDef = {
  key: MissionKey;
  href: string;
  helpAnchor: string;
  roles: AssistanceFocusRole[];
  order: number;
  /** Nav feature key — mission hidden if nav item hidden */
  requiresNavKey?: string;
};

export const MISSION_DEFINITIONS: MissionDef[] = [
  {
    key: "schedule_meeting",
    href: "/meetings/new?walkthrough=create_meeting",
    helpAnchor: "meetings",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 1,
    requiresNavKey: "meetings",
  },
  {
    key: "run_live_meeting",
    href: "/meetings?walkthrough=live_meeting",
    helpAnchor: "meetings",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 2,
    requiresNavKey: "meetings",
  },
  {
    key: "draft_minute",
    href: "/minutes?walkthrough=finalize_minute",
    helpAnchor: "minutes",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 3,
    requiresNavKey: "minutes",
  },
  {
    key: "finalize_minute",
    href: "/minutes?walkthrough=finalize_minute",
    helpAnchor: "minutes",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 4,
    requiresNavKey: "minutes",
  },
  {
    key: "add_members",
    href: "/members",
    helpAnchor: "dues",
    roles: ["SECRETARY", "TREASURER", "PRESIDENT", "READER"],
    order: 5,
    requiresNavKey: "members",
  },
  {
    key: "record_dues",
    href: "/members/dues?walkthrough=manage_dues",
    helpAnchor: "dues",
    roles: ["TREASURER", "PRESIDENT", "SECRETARY"],
    order: 6,
    requiresNavKey: "members",
  },
  {
    key: "treasury_entry",
    href: "/treasury",
    helpAnchor: "dues",
    roles: ["TREASURER", "PRESIDENT"],
    order: 7,
    requiresNavKey: "treasury",
  },
  {
    key: "invite_team",
    href: "/settings/users",
    helpAnchor: "getting-started",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 8,
    requiresNavKey: "settings",
  },
  {
    key: "send_email",
    href: "/emails?walkthrough=send_email",
    helpAnchor: "emails",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 9,
    requiresNavKey: "emails",
  },
  {
    key: "explore_calendar",
    href: "/calendar?walkthrough=explore_calendar",
    helpAnchor: "meetings",
    roles: ["SECRETARY", "PRESIDENT", "READER"],
    order: 10,
    requiresNavKey: "calendar",
  },
  {
    key: "create_event",
    href: "/events?walkthrough=create_event",
    helpAnchor: "meetings",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 11,
    requiresNavKey: "events",
  },
  {
    key: "configure_settings",
    href: "/settings?walkthrough=configure_settings",
    helpAnchor: "getting-started",
    roles: ["SECRETARY", "PRESIDENT"],
    order: 12,
    requiresNavKey: "settings",
  },
  {
    key: "review_attendance",
    href: "/attendance-reports?walkthrough=review_attendance",
    helpAnchor: "meetings",
    roles: ["SECRETARY", "PRESIDENT", "TREASURER"],
    order: 13,
    requiresNavKey: "attendanceReports",
  },
  {
    key: "update_profile",
    href: "/my-account?walkthrough=update_profile",
    helpAnchor: "getting-started",
    roles: ["SECRETARY", "TREASURER", "PRESIDENT", "READER"],
    order: 14,
    requiresNavKey: "myAccount",
  },
];

export function inferFocusRole(clubRole: string): AssistanceFocusRole {
  if (clubRole === "TREASURER") return "TREASURER";
  if (clubRole === "PRESIDENT") return "PRESIDENT";
  if (clubRole === "READER") return "READER";
  return "SECRETARY";
}

export function getMissionsForRole(
  role: AssistanceFocusRole,
  hiddenNavKeys: string[]
): MissionDef[] {
  return MISSION_DEFINITIONS.filter((m) => {
    if (!m.roles.includes(role)) return false;
    if (m.requiresNavKey && hiddenNavKeys.includes(m.requiresNavKey)) return false;
    return true;
  }).sort((a, b) => a.order - b.order);
}