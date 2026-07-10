export type UsageGuideStepKey =
  | "WELCOME"
  | "DASHBOARD"
  | "MEETINGS"
  | "MINUTES"
  | "MEMBERS"
  | "TREASURY"
  | "EMAILS"
  | "CALENDAR"
  | "EVENTS"
  | "ATTENDANCE"
  | "PROFILE"
  | "SETTINGS"
  | "COMPLETE";

export type UsageGuideStep = {
  key: UsageGuideStepKey;
  type: "modal" | "spotlight";
  /** Matches `data-guide` on sidebar / mobile nav items */
  target?: string;
  requiresNavKey?: string;
  /** In-app path opened via « Try section » */
  href?: string;
};

export const USAGE_GUIDE_STEPS: UsageGuideStep[] = [
  { key: "WELCOME", type: "modal" },
  {
    key: "DASHBOARD",
    type: "spotlight",
    target: "dashboard",
    requiresNavKey: "dashboard",
    href: "/dashboard",
  },
  {
    key: "MEETINGS",
    type: "spotlight",
    target: "meetings",
    requiresNavKey: "meetings",
    href: "/meetings",
  },
  {
    key: "MINUTES",
    type: "spotlight",
    target: "minutes",
    requiresNavKey: "minutes",
    href: "/minutes",
  },
  {
    key: "MEMBERS",
    type: "spotlight",
    target: "members",
    requiresNavKey: "members",
    href: "/members",
  },
  {
    key: "TREASURY",
    type: "spotlight",
    target: "treasury",
    requiresNavKey: "treasury",
    href: "/treasury",
  },
  {
    key: "EMAILS",
    type: "spotlight",
    target: "emails",
    requiresNavKey: "emails",
    href: "/emails",
  },
  {
    key: "CALENDAR",
    type: "spotlight",
    target: "calendar",
    requiresNavKey: "calendar",
    href: "/calendar",
  },
  {
    key: "EVENTS",
    type: "spotlight",
    target: "events",
    requiresNavKey: "events",
    href: "/events",
  },
  {
    key: "ATTENDANCE",
    type: "spotlight",
    target: "attendanceReports",
    requiresNavKey: "attendanceReports",
    href: "/attendance-reports",
  },
  {
    key: "PROFILE",
    type: "spotlight",
    target: "myAccount",
    requiresNavKey: "myAccount",
    href: "/my-account",
  },
  {
    key: "SETTINGS",
    type: "spotlight",
    target: "settings",
    requiresNavKey: "settings",
    href: "/settings",
  },
  { key: "COMPLETE", type: "modal" },
];

export function getVisibleUsageGuideSteps(hiddenNavKeys: string[]): UsageGuideStep[] {
  return USAGE_GUIDE_STEPS.filter((step) => {
    if (!step.requiresNavKey) return true;
    return !hiddenNavKeys.includes(step.requiresNavKey);
  });
}