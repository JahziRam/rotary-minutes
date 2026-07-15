import { startOfMonth } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type MinuteAiPlatformConfig = {
  globallyEnabled: boolean;
  monthlyQuotaPerClub: number;
  model: string;
};

export type MinuteAiAdminView = MinuteAiPlatformConfig & {
  apiConfigured: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string;
  envFallback: boolean;
};

type MinuteAiStoredConfig = MinuteAiPlatformConfig & {
  apiKey?: string;
};

const DEFAULT_MINUTE_AI_CONFIG: MinuteAiPlatformConfig = {
  globallyEnabled: true,
  monthlyQuotaPerClub: 50,
  model: process.env.XAI_MINUTE_AI_MODEL ?? "grok-3-mini",
};

type AppConfigJson = {
  minuteAi?: Partial<MinuteAiStoredConfig>;
};

function readStoredMinuteAi(config: unknown): MinuteAiStoredConfig {
  const stored = (config as AppConfigJson | null)?.minuteAi ?? {};
  return {
    ...DEFAULT_MINUTE_AI_CONFIG,
    ...stored,
    model: stored.model ?? DEFAULT_MINUTE_AI_CONFIG.model,
  };
}

export function maskMinuteAiApiKey(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 12) return "••••••••";
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}

export async function getStoredMinuteAi(): Promise<MinuteAiStoredConfig> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: { config: true },
  });
  return readStoredMinuteAi(settings?.config);
}

export async function resolveMinuteAiApiKey(): Promise<string> {
  const stored = await getStoredMinuteAi();
  return stored.apiKey?.trim() || process.env.XAI_API_KEY?.trim() || "";
}

export async function isMinuteAiApiConfigured(): Promise<boolean> {
  return Boolean(await resolveMinuteAiApiKey());
}

export async function getMinuteAiPlatformConfig(): Promise<MinuteAiPlatformConfig> {
  try {
    const stored = await getStoredMinuteAi();
    const { apiKey: _apiKey, ...publicConfig } = stored;
    return publicConfig;
  } catch {
    return DEFAULT_MINUTE_AI_CONFIG;
  }
}

export async function getMinuteAiAdminView(): Promise<MinuteAiAdminView> {
  const [stored, resolvedKey] = await Promise.all([
    getStoredMinuteAi(),
    resolveMinuteAiApiKey(),
  ]);
  const { apiKey: _apiKey, ...publicConfig } = stored;
  const envFallback = !stored.apiKey?.trim() && Boolean(process.env.XAI_API_KEY?.trim());

  return {
    ...publicConfig,
    apiConfigured: Boolean(resolvedKey),
    apiKeySet: Boolean(stored.apiKey?.trim() || process.env.XAI_API_KEY?.trim()),
    apiKeyPreview: maskMinuteAiApiKey(resolvedKey),
    envFallback,
  };
}

export async function saveMinuteAiPlatformConfig(
  patch: Partial<MinuteAiStoredConfig>
): Promise<MinuteAiPlatformConfig> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: { config: true },
  });
  const current = readStoredMinuteAi(settings?.config);
  const config = (settings?.config as AppConfigJson | null) ?? {};

  const next: MinuteAiStoredConfig = {
    globallyEnabled: patch.globallyEnabled ?? current.globallyEnabled,
    monthlyQuotaPerClub: patch.monthlyQuotaPerClub ?? current.monthlyQuotaPerClub,
    model: patch.model?.trim() || current.model,
    apiKey: patch.apiKey?.trim() || current.apiKey,
  };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      config: {
        ...config,
        minuteAi: next,
      } as unknown as Prisma.InputJsonValue,
    },
    create: {
      id: "global",
      config: { minuteAi: next } as unknown as Prisma.InputJsonValue,
    },
  });

  const { apiKey: _apiKey, ...publicConfig } = next;
  return publicConfig;
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