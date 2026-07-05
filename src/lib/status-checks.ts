import { prisma } from "@/lib/prisma";
import { isEmailEnabled } from "@/lib/email";

export type ServiceStatus = "operational" | "degraded" | "down";

export interface StatusCheck {
  name: string;
  status: ServiceStatus;
  detail: string;
}

const CRON_ENDPOINTS = [
  "/api/cron/trial-reminders",
  "/api/cron/trial-expiry",
  "/api/cron/email-campaigns",
] as const;

export async function checkDatabase(): Promise<StatusCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", status: "operational", detail: "Connected" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { name: "database", status: "down", detail: msg };
  }
}

export async function checkResend(): Promise<StatusCheck> {
  const enabled = await isEmailEnabled();
  if (enabled) {
    return { name: "resend", status: "operational", detail: "Configured" };
  }
  const { resolveIntegrations, isResendConfigured } = await import(
    "@/lib/platform-integrations"
  );
  const creds = await resolveIntegrations();
  if (isResendConfigured(creds)) {
    return { name: "resend", status: "degraded", detail: "API key set but disabled in settings" };
  }
  return { name: "resend", status: "degraded", detail: "Not configured (emails skipped)" };
}

export async function checkCronJobs(): Promise<StatusCheck> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  const results: string[] = [];

  for (const path of CRON_ENDPOINTS) {
    try {
      const headers: HeadersInit = secret ? { authorization: `Bearer ${secret}` } : {};
      const res = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      results.push(`${path}:${res.status}`);
    } catch {
      results.push(`${path}:error`);
    }
  }

  const allOk = results.every((r) => r.endsWith(":200") || r.endsWith(":401"));
  const anyOk = results.some((r) => r.endsWith(":200"));

  if (anyOk) {
    return { name: "cron", status: "operational", detail: results.join(", ") };
  }
  if (allOk && !secret) {
    return { name: "cron", status: "degraded", detail: "Endpoints reachable; CRON_SECRET not set" };
  }
  return { name: "cron", status: "degraded", detail: results.join(", ") };
}

export async function getSystemStatus(): Promise<{
  checks: StatusCheck[];
  overall: ServiceStatus;
  checkedAt: string;
}> {
  const [database, resend, cron] = await Promise.all([
    checkDatabase(),
    checkResend(),
    checkCronJobs(),
  ]);

  const checks = [database, resend, cron];
  const overall: ServiceStatus = checks.some((c) => c.status === "down")
    ? "down"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "operational";

  return { checks, overall, checkedAt: new Date().toISOString() };
}