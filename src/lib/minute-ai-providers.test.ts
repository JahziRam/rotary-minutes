import { afterEach, describe, expect, it } from "vitest";
import {
  defaultModelForProvider,
  parseMinuteAiProvider,
  resolveChatCompletionsUrl,
  resolveEnvApiKey,
  resolveModelForProvider,
} from "./minute-ai-providers";

describe("minute-ai-providers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("parses known providers and defaults to xai", () => {
    expect(parseMinuteAiProvider(undefined)).toBe("xai");
    expect(parseMinuteAiProvider("unknown")).toBe("xai");
    expect(parseMinuteAiProvider("qwen")).toBe("qwen");
    expect(parseMinuteAiProvider("openai")).toBe("openai");
  });

  it("resolves chat completion URLs per provider", () => {
    expect(resolveChatCompletionsUrl("xai")).toBe(
      "https://api.x.ai/v1/chat/completions"
    );
    expect(resolveChatCompletionsUrl("openai")).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
    expect(resolveChatCompletionsUrl("qwen")).toBe(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
    );
  });

  it("honors custom base URLs from env", () => {
    process.env.QWEN_API_BASE_URL =
      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/";
    expect(resolveChatCompletionsUrl("qwen")).toBe(
      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions"
    );

    process.env.OPENAI_API_BASE_URL = "https://api.openai.com/v1/";
    expect(resolveChatCompletionsUrl("openai")).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
  });

  it("prefers admin override over env base URL", () => {
    process.env.OPENAI_API_BASE_URL = "https://api.openai.com/v1";
    expect(
      resolveChatCompletionsUrl("openai", "https://bazaarlink.ai/api/v1")
    ).toBe("https://bazaarlink.ai/api/v1/chat/completions");
  });

  it("resolves env API keys per provider", () => {
    process.env.XAI_API_KEY = "xai-key";
    process.env.DASHSCOPE_API_KEY = "qwen-key";
    process.env.OPENAI_API_KEY = "openai-key";
    expect(resolveEnvApiKey("xai")).toBe("xai-key");
    expect(resolveEnvApiKey("qwen")).toBe("qwen-key");
    expect(resolveEnvApiKey("openai")).toBe("openai-key");
  });

  it("uses provider default models", () => {
    expect(defaultModelForProvider("xai")).toBe("grok-3-mini");
    expect(defaultModelForProvider("qwen")).toBe("qwen-plus");
    expect(defaultModelForProvider("openai")).toBe("gpt-4o-mini");
    process.env.OPENAI_MINUTE_AI_MODEL = "gpt-4o";
    expect(defaultModelForProvider("openai")).toBe("gpt-4o");
  });

  it("replaces mismatched models for the selected provider", () => {
    expect(resolveModelForProvider("qwen", "grok-3-mini")).toBe("qwen-plus");
    expect(resolveModelForProvider("xai", "qwen-plus")).toBe("grok-3-mini");
    expect(resolveModelForProvider("openai", "grok-3-mini")).toBe("gpt-4o-mini");
    expect(resolveModelForProvider("openai", "gpt-4o")).toBe("gpt-4o");
    expect(resolveModelForProvider("qwen", "qwen-turbo")).toBe("qwen-turbo");
  });
});