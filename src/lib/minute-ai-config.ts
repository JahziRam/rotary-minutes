import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";

export type MinuteAiPlatformConfig = {
  globallyEnabled: boolean;
  monthlyQuotaPerClub: number;
  model: string;
};

const DEFAULT_MINUTE_AI_CONFIG: MinuteAiPlatformConfig = {
  globallyEnabled: true,
  monthlyQuotaPerClub: 50,
  model: process.env.XAI_MINUTE_AI_MODEL ?? "grok-3-mini",
};

type AppConfigJson = {
  minuteAi?: Partial<MinuteAiPlatformConfig>;
};

export function isMinuteAiApiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export async function getMinuteAiPlatformConfig(): Promise<MinuteAiPlatformConfig> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "global" },
      select: { config: true },
    });
    const stored = (settings?.config as AppConfigJson | null)?.minuteAi ?? {};
    return {
      ...DEFAULT_MINUTE_AI_CONFIG,
      ...stored,
      model: stored.model ?? DEFAULT_MINUTE_AI_CONFIG.model,
    };
  } catch {
    return DEFAULT_MINUTE_AI_CONFIG;
  }
}

export async function saveMinuteAiPlatformConfig(
  patch: Partial<MinuteAiPlatformConfig>
): Promise<MinuteAiPlatformConfig> {
  const current = await getMinuteAiPlatformConfig();
  const next = { ...current, ...patch };

  const existing = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: { config: true },
  });
  const config = (existing?.config as AppConfigJson | null) ?? {};

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      config: {
        ...config,
        minuteAi: next,
      },
    },
    create: {
      id: "global",
      config: { minuteAi: next },
    },
  });

  return next;
}

export async function countMinuteAiUsageThisMonth(clubId: string): Promise<number> {
  return prisma.auditLog.count({
    where: {
      clubId,
      action: "MINUTE_AI_POLISH",
      createdAt: { gte: startOfMonth(new Date()) },
    },
  });
}