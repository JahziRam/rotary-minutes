/** Client-safe analytics config from environment variables. */
export function normalizeGaId(value: string | undefined | null): string | null {
  const id = value?.trim();
  return id?.startsWith("G-") ? id : null;
}

export function getEnvAnalyticsConfig(): {
  measurementId: string | null;
  enabled: boolean;
} {
  const measurementId = normalizeGaId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  if (!measurementId) return { measurementId: null, enabled: false };
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "false") {
    return { measurementId, enabled: false };
  }
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_GA_ENABLED !== "true") {
    return { measurementId, enabled: false };
  }
  return { measurementId, enabled: true };
}