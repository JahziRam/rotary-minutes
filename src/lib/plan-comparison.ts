import type { SubscriptionPlan } from "@/generated/prisma/client";
import { getPlanFeaturePreset } from "@/lib/plan-features";
import type { ComparisonOverrides } from "@/lib/plans-utils";

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

function applyOverrides(
  matrix: Record<ComparisonRowKey, Record<SubscriptionPlan, ComparisonValue>>,
  overrides: ComparisonOverrides = {}
): Record<ComparisonRowKey, Record<SubscriptionPlan, ComparisonValue>> {
  const result = { ...matrix } as Record<
    ComparisonRowKey,
    Record<SubscriptionPlan, ComparisonValue>
  >;
  for (const row of Object.keys(overrides) as ComparisonRowKey[]) {
    const rowOverrides = overrides[row];
    if (!rowOverrides) continue;
    result[row] = { ...result[row] };
    for (const plan of Object.keys(rowOverrides) as SubscriptionPlan[]) {
      const value = rowOverrides[plan];
      if (value !== undefined) result[row][plan] = value;
    }
  }
  return result;
}

export function getPlanComparisonMatrix(
  memberLimits: Partial<Record<SubscriptionPlan, number | null>> = {},
  overrides: ComparisonOverrides = {}
): Record<ComparisonRowKey, Record<SubscriptionPlan, ComparisonValue>> {
  const starter = getPlanFeaturePreset("STARTER");
  const pro = getPlanFeaturePreset("PROFESSIONAL");
  const enterprise = getPlanFeaturePreset("ENTERPRISE");

  const bool = (v: boolean) => v;
  const members = (plan: SubscriptionPlan, fallback: number | null) => {
    const limit = memberLimits[plan] ?? fallback;
    return limit == null ? "unlimited" : String(limit);
  };

  const matrix = {
    members: {
      STARTER: members("STARTER", starter.memberLimit),
      PROFESSIONAL: members("PROFESSIONAL", pro.memberLimit),
      ENTERPRISE: members("ENTERPRISE", enterprise.memberLimit),
      TRIAL: members("PROFESSIONAL", pro.memberLimit),
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

  return applyOverrides(matrix, overrides);
}