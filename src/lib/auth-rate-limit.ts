import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60 * 60 * 1000;

const LIMITS: Record<string, number> = {
  LOGIN_FAILED: 10,
  PASSWORD_RESET: 5,
  AUTH_CAPTCHA_FAILED: 15,
};

export async function assertAuthRateLimit(
  action: keyof typeof LIMITS,
  key: string
): Promise<{ ok: true } | { ok: false; error: "RATE_LIMIT" }> {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return { ok: true };

  const since = new Date(Date.now() - WINDOW_MS);
  const max = LIMITS[action] ?? 10;

  const logs = await prisma.auditLog.findMany({
    where: { action, createdAt: { gte: since } },
    select: { metadata: true },
    take: 500,
  });

  const count = logs.filter((log) => {
    const meta = log.metadata as { key?: string } | null;
    return meta?.key === normalized;
  }).length;

  if (count >= max) return { ok: false, error: "RATE_LIMIT" };
  return { ok: true };
}

export async function logAuthEvent(
  action: string,
  key: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action,
      entity: "Auth",
      metadata: { key: key.trim().toLowerCase(), ...extra },
    },
  });
}