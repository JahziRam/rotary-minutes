import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isEmailEnabled } from "@/lib/email";
import { checkEnv } from "@/lib/env";
import {
  resolveIntegrations,
  isStripeConfigured,
  isResendConfigured,
} from "@/lib/platform-integrations";

export interface HealthCheckResult {
  database: { ok: boolean; latencyMs: number | null; error?: string };
  resendConfigured: boolean;
  emailEnabled: boolean;
  trialsExpiringCount: number;
  maintenanceMode: boolean;
  stripeEnabled: boolean;
  stripeConfigured: boolean;
  envChecks: { requiredOk: number; requiredTotal: number; recommendedOk: number; recommendedTotal: number };
}

const EMPTY_HEALTH: HealthCheckResult = {
  database: { ok: false, latencyMs: null, error: "Check failed" },
  resendConfigured: false,
  emailEnabled: false,
  trialsExpiringCount: 0,
  maintenanceMode: false,
  stripeEnabled: false,
  stripeConfigured: false,
  envChecks: { requiredOk: 0, requiredTotal: 2, recommendedOk: 0, recommendedTotal: 5 },
};

export async function getHealthChecks(): Promise<HealthCheckResult> {
  try {
    return await loadHealthChecks();
  } catch (e) {
    console.error("[getHealthChecks] failed:", e);
    return EMPTY_HEALTH;
  }
}

async function loadHealthChecks(): Promise<HealthCheckResult> {
  const trialDeadline = addDays(new Date(), 7);

  let database: HealthCheckResult["database"] = { ok: false, latencyMs: null };
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    database = {
      ok: false,
      latencyMs: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  const [settings, trialsExpiringCount, emailEnabled, integrations] =
    await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "global" } }),
    prisma.subscription.count({
      where: {
        status: "TRIALING",
        OR: [
          { trialEndsAt: { lte: trialDeadline } },
          { trialEndsAt: null },
        ],
      },
    }),
    isEmailEnabled(),
    resolveIntegrations(),
  ]);

  const resendConfigured = isResendConfigured(integrations);

  const env = checkEnv();
  const required = env.filter((e) => e.required);
  const recommended = env.filter((e) => !e.required);

  return {
    database,
    resendConfigured,
    emailEnabled,
    trialsExpiringCount,
    maintenanceMode: settings?.maintenanceMode ?? false,
    stripeEnabled: settings?.stripeEnabled ?? false,
    stripeConfigured: isStripeConfigured(integrations),
    envChecks: {
      requiredOk: required.filter((e) => e.ok).length,
      requiredTotal: required.length,
      recommendedOk: recommended.filter((e) => e.ok).length,
      recommendedTotal: recommended.length,
    },
  };
}