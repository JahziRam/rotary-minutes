import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnvAnalyticsConfig, normalizeGaId } from "./analytics-env";

describe("normalizeGaId", () => {
  it("accepts valid GA4 measurement ids", () => {
    expect(normalizeGaId(" G-BLS005G55Y ")).toBe("G-BLS005G55Y");
  });

  it("rejects invalid ids", () => {
    expect(normalizeGaId("UA-123")).toBeNull();
    expect(normalizeGaId("")).toBeNull();
    expect(normalizeGaId(undefined)).toBeNull();
  });
});

describe("getEnvAnalyticsConfig", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("disables tracking when GA id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    expect(getEnvAnalyticsConfig()).toEqual({ measurementId: null, enabled: false });
  });

  it("disables tracking when explicitly turned off", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
    vi.stubEnv("NEXT_PUBLIC_GA_ENABLED", "false");
    expect(getEnvAnalyticsConfig()).toEqual({
      measurementId: "G-TEST12345",
      enabled: false,
    });
  });

  it("enables tracking in production with valid id", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
    vi.stubEnv("NEXT_PUBLIC_GA_ENABLED", undefined);
    expect(getEnvAnalyticsConfig()).toEqual({
      measurementId: "G-TEST12345",
      enabled: true,
    });
  });

  it("requires explicit opt-in outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
    vi.stubEnv("NEXT_PUBLIC_GA_ENABLED", undefined);
    expect(getEnvAnalyticsConfig()).toEqual({
      measurementId: "G-TEST12345",
      enabled: false,
    });
  });
});