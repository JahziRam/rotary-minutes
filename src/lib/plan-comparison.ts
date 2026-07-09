import type { SubscriptionPlan } from "@/generated/prisma/client";
import { getPlanFeaturePreset } from "@/lib/plan-features";

export type ComparisonRowKey =
  | "members"
  | "minutesPdf"
  | "liveMeetings"
  | "dues"
  | "treasury"
  | "emails"
  | "statistics"
  | "events"
  | "attendance"
  | "district"
  | "api"
  | "offline"
  | "governance"
  | "integrations";

export type ComparisonValue = boolean | string;

export const COMPARISON_PLANS: SubscriptionPlan[] = [
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export function getPlanComparisonMatrix(): Record<
  ComparisonRowKey,
  Record<SubscriptionPlan, ComparisonValue>
> {
  const starter = getPlanFeaturePreset("STARTER");
  const pro = getPlanFeaturePreset("PROFESSIONAL");
  const enterprise = getPlanFeaturePreset("ENTERPRISE");

  const bool = (v: boolean) => v;
  const members = (limit: number | null) =>
    limit == null ? "unlimited" : String(limit);

  return {
    members: {
      STARTER: members(starter.memberLimit),
      PROFESSIONAL: members(pro.memberLimit),
      ENTERPRISE: members(enterprise.memberLimit),
      TRIAL: members(pro.memberLimit),
    },
    minutesPdf: {
      STARTER: bool(starter.pdfExport),
      PROFESSIONAL: bool(pro.pdfExport),
      ENTERPRISE: bool(enterprise.pdfExport),
      TRIAL: bool(pro.pdfExport),
    },
    liveMeetings: {
      STARTER: bool(starter.liveMeetings),
      PROFESSIONAL: bool(pro.liveMeetings),
      ENTERPRISE: bool(enterprise.liveMeetings),
      TRIAL: bool(pro.liveMeetings),
    },
    dues: {
      STARTER: bool(starter.duesEnabled),
      PROFESSIONAL: bool(pro.duesEnabled),
      ENTERPRISE: bool(enterprise.duesEnabled),
      TRIAL: bool(pro.duesEnabled),
    },
    treasury: {
      STARTER: bool(starter.treasuryEnabled),
      PROFESSIONAL: bool(pro.treasuryEnabled),
      ENTERPRISE: bool(enterprise.treasuryEnabled),
      TRIAL: bool(pro.treasuryEnabled),
    },
    emails: {
      STARTER: bool(starter.emailsEnabled),
      PROFESSIONAL: bool(pro.emailsEnabled),
      ENTERPRISE: bool(enterprise.emailsEnabled),
      TRIAL: bool(pro.emailsEnabled),
    },
    statistics: {
      STARTER: bool(starter.statisticsEnabled),
      PROFESSIONAL: bool(pro.statisticsEnabled),
      ENTERPRISE: bool(enterprise.statisticsEnabled),
      TRIAL: bool(pro.statisticsEnabled),
    },
    events: {
      STARTER: bool(starter.eventsEnabled),
      PROFESSIONAL: bool(pro.eventsEnabled),
      ENTERPRISE: bool(enterprise.eventsEnabled),
      TRIAL: bool(pro.eventsEnabled),
    },
    attendance: {
      STARTER: bool(starter.attendanceReportsEnabled),
      PROFESSIONAL: bool(pro.attendanceReportsEnabled),
      ENTERPRISE: bool(enterprise.attendanceReportsEnabled),
      TRIAL: bool(pro.attendanceReportsEnabled),
    },
    district: {
      STARTER: bool(starter.districtDashboard),
      PROFESSIONAL: bool(pro.districtDashboard),
      ENTERPRISE: bool(enterprise.districtDashboard),
      TRIAL: bool(pro.districtDashboard),
    },
    api: {
      STARTER: bool(starter.apiAccessEnabled),
      PROFESSIONAL: bool(pro.apiAccessEnabled),
      ENTERPRISE: bool(enterprise.apiAccessEnabled),
      TRIAL: bool(pro.apiAccessEnabled),
    },
    offline: {
      STARTER: bool(starter.offlineMode),
      PROFESSIONAL: bool(pro.offlineMode),
      ENTERPRISE: bool(enterprise.offlineMode),
      TRIAL: bool(pro.offlineMode),
    },
    governance: {
      STARTER: bool(starter.governanceEnabled),
      PROFESSIONAL: bool(pro.governanceEnabled),
      ENTERPRISE: bool(enterprise.governanceEnabled),
      TRIAL: bool(pro.governanceEnabled),
    },
    integrations: {
      STARTER: bool(starter.integrationsEnabled),
      PROFESSIONAL: bool(pro.integrationsEnabled),
      ENTERPRISE: bool(enterprise.integrationsEnabled),
      TRIAL: bool(pro.integrationsEnabled),
    },
  };
}