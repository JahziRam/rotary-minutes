import { afterEach, describe, expect, it } from "vitest";
import {
  defaultModelForProvider,
  parseMinuteAiProvider,
  resolveChatCompletionsUrl,
  resolveEnvApiKey,
} from "./minute-ai-providers";

describe("minute-ai-providers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults unknown providers to xai", () => {
    expect(parseMinuteAiProvider(undefined)).toBe("xai");
    expect(parseMinuteAiProvider("openai")).toBe("xai");
    expect(parseMinuteAiProvider("qwen")).toBe("qwen");
  });

  it("resolves chat completion URLs per provider", () => {
    expect(resolveChatCompletionsUrl("xai")).toBe(
      "https://api.x.ai/v1/chat/completions"
    );
    expect(resolveChatCompletionsUrl("qwen")).toBe(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
    );
  });

  it("honors custom Qwen base URL", () => {
    process.env.QWEN_API_BASE_URL = "https://dashscope-us.aliyuncs.com/compatible-mode/v1/";
    expect(resolveChatCompletionsUrl("qwen")).toBe(
      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions"
    );
  });

  it("resolves env API keys per provider", () => {
    process.env.XAI_API_KEY = "xai-key";
    process.env.DASHSCOPE_API_KEY = "qwen-key";
    expect(resolveEnvApiKey("xai")).toBe("xai-key");
    expect(resolveEnvApiKey("qwen")).toBe("qwen-key");
  });

  it("uses provider default models", () => {
    expect(defaultModelForProvider("xai")).toBe("grok-3-mini");
    expect(defaultModelForProvider("qwen")).toBe("qwen-plus");
    process.env.QWEN_MINUTE_AI_MODEL = "qwen-turbo";
    expect(defaultModelForProvider("qwen")).toBe("qwen-turbo");
  });
});