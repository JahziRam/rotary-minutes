export type MinuteAiProvider = "xai" | "qwen" | "openai";

export const MINUTE_AI_PROVIDER_IDS: MinuteAiProvider[] = ["xai", "qwen", "openai"];

export type MinuteAiProviderMeta = {
  id: MinuteAiProvider;
  labelEn: string;
  labelFr: string;
  defaultModel: string;
  envApiKeyVars: string[];
  envModelVar?: string;
  apiKeyPlaceholder: string;
};

const PROVIDER_META: Record<MinuteAiProvider, MinuteAiProviderMeta> = {
  xai: {
    id: "xai",
    labelEn: "SpaceXAI (xAI)",
    labelFr: "SpaceXAI (xAI)",
    defaultModel: "grok-3-mini",
    envApiKeyVars: ["XAI_API_KEY"],
    envModelVar: "XAI_MINUTE_AI_MODEL",
    apiKeyPlaceholder: "xai-...",
  },
  qwen: {
    id: "qwen",
    labelEn: "Qwen (DashScope)",
    labelFr: "Qwen (DashScope)",
    defaultModel: "qwen-plus",
    envApiKeyVars: ["DASHSCOPE_API_KEY", "QWEN_API_KEY"],
    envModelVar: "QWEN_MINUTE_AI_MODEL",
    apiKeyPlaceholder: "sk-...",
  },
  openai: {
    id: "openai",
    labelEn: "OpenAI",
    labelFr: "OpenAI",
    defaultModel: "gpt-4o-mini",
    envApiKeyVars: ["OPENAI_API_KEY"],
    envModelVar: "OPENAI_MINUTE_AI_MODEL",
    apiKeyPlaceholder: "sk-...",
  },
};

export function parseMinuteAiProvider(value: unknown): MinuteAiProvider {
  if (value === "qwen") return "qwen";
  if (value === "openai") return "openai";
  return "xai";
}

export function getMinuteAiProviderMeta(provider: MinuteAiProvider): MinuteAiProviderMeta {
  return PROVIDER_META[provider];
}

export function resolveEnvApiKey(provider: MinuteAiProvider): string {
  for (const envVar of PROVIDER_META[provider].envApiKeyVars) {
    const key = process.env[envVar]?.trim();
    if (key) return key;
  }
  return "";
}

export function resolveEnvDefaultModel(provider: MinuteAiProvider): string {
  const envVar = PROVIDER_META[provider].envModelVar;
  if (!envVar) return "";
  return process.env[envVar]?.trim() ?? "";
}

export function defaultModelForProvider(provider: MinuteAiProvider): string {
  return resolveEnvDefaultModel(provider) || PROVIDER_META[provider].defaultModel;
}

export function resolveChatCompletionsUrl(provider: MinuteAiProvider): string {
  if (provider === "xai") {
    return "https://api.x.ai/v1/chat/completions";
  }

  if (provider === "openai") {
    const base =
      process.env.OPENAI_API_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim() ||
      "https://api.openai.com/v1";
    return `${base.replace(/\/$/, "")}/chat/completions`;
  }

  const base =
    process.env.QWEN_API_BASE_URL?.trim() ||
    process.env.DASHSCOPE_BASE_URL?.trim() ||
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

  return `${base.replace(/\/$/, "")}/chat/completions`;
}

export function primaryEnvApiKeyVar(provider: MinuteAiProvider): string {
  return PROVIDER_META[provider].envApiKeyVars[0]!;
}

function modelFamily(model: string): MinuteAiProvider | "unknown" {
  if (/^grok/i.test(model)) return "xai";
  if (/^qwen/i.test(model)) return "qwen";
  if (/^gpt-|^o[0-9](-|$)/i.test(model)) return "openai";
  return "unknown";
}

export function resolveModelForProvider(
  provider: MinuteAiProvider,
  model: string | undefined | null
): string {
  const trimmed = model?.trim() ?? "";
  if (!trimmed) return defaultModelForProvider(provider);

  const family = modelFamily(trimmed);
  if (family !== "unknown" && family !== provider) {
    return defaultModelForProvider(provider);
  }

  return trimmed;
}