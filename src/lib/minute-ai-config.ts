import { startOfMonth } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  defaultModelForProvider,
  parseMinuteAiProvider,
  primaryEnvApiKeyVar,
  resolveEnvApiBaseUrl,
  resolveEnvApiKey,
  type MinuteAiProvider,
} from "@/lib/minute-ai-providers";

export type { MinuteAiProvider } from "@/lib/minute-ai-providers";

export type MinuteAiPlatformConfig = {
  globallyEnabled: boolean;
  monthlyQuotaPerClub: number;
  provider: MinuteAiProvider;
  model: string;
};

export type MinuteAiAdminView = MinuteAiPlatformConfig & {
  apiConfigured: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string;
  apiBaseUrl: string;
  envFallback: boolean;
  envFallbackVar: string;
};

type MinuteAiStoredConfig = MinuteAiPlatformConfig & {
  apiKey?: string;
  apiBaseUrl?: string;
};

const DEFAULT_MINUTE_AI_PROVIDER: MinuteAiProvider = "xai";

const DEFAULT_MINUTE_AI_CONFIG: MinuteAiPlatformConfig = {
  globallyEnabled: true,
  monthlyQuotaPerClub: 50,
  provider: DEFAULT_MINUTE_AI_PROVIDER,
  model: defaultModelForProvider(DEFAULT_MINUTE_AI_PROVIDER),
};

type AppConfigJson = {
  minuteAi?: Partial<MinuteAiStoredConfig>;
};

function readStoredMinuteAi(config: unknown): MinuteAiStoredConfig {
  const stored = (config as AppConfigJson | null)?.minuteAi ?? {};
  const provider = parseMinuteAiProvider(stored.provider);
  return {
    ...DEFAULT_MINUTE_AI_CONFIG,
    ...stored,
    provider,
    model: stored.model ?? defaultModelForProvider(provider),
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
  return stored.apiKey?.trim() || resolveEnvApiKey(stored.provider);
}

export async function resolveMinuteAiApiBaseUrl(): Promise<string> {
  const stored = await getStoredMinuteAi();
  return stored.apiBaseUrl?.trim() || resolveEnvApiBaseUrl(stored.provider);
}

export async function isMinuteAiApiConfigured(): Promise<boolean> {
  const stored = await getStoredMinuteAi();
  return Boolean(stored.apiKey?.trim() || resolveEnvApiKey(stored.provider));
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
  const provider = parseMinuteAiProvider(stored.provider);
  const envFallback = !stored.apiKey?.trim() && Boolean(resolveEnvApiKey(provider));

  return {
    ...publicConfig,
    provider,
    apiConfigured: Boolean(resolvedKey),
    apiKeySet: Boolean(stored.apiKey?.trim() || resolveEnvApiKey(provider)),
    apiKeyPreview: maskMinuteAiApiKey(resolvedKey),
    apiBaseUrl: stored.apiBaseUrl?.trim() || resolveEnvApiBaseUrl(provider),
    envFallback,
    envFallbackVar: primaryEnvApiKeyVar(provider),
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

  const provider = patch.provider
    ? parseMinuteAiProvider(patch.provider)
    : current.provider;

  const next: MinuteAiStoredConfig = {
    globallyEnabled: patch.globallyEnabled ?? current.globallyEnabled,
    monthlyQuotaPerClub: patch.monthlyQuotaPerClub ?? current.monthlyQuotaPerClub,
    provider,
    model: patch.model?.trim() || current.model || defaultModelForProvider(provider),
    apiKey: patch.apiKey?.trim() || current.apiKey,
    apiBaseUrl:
      patch.apiBaseUrl !== undefined
        ? patch.apiBaseUrl.trim() || current.apiBaseUrl
        : current.apiBaseUrl,
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