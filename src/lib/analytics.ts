import { hasAnalyticsConsent } from "@/lib/cookie-consent";

declare global {
  interface Window {
    __RM_GA_ID__?: string;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function resolveGaMeasurementId(runtimeId?: string | null): string | null {
  const fromWindow =
    typeof window !== "undefined" ? window.__RM_GA_ID__?.trim() : undefined;
  const id = runtimeId?.trim() || fromWindow;
  return id?.startsWith("G-") ? id : null;
}

export function isAnalyticsRuntimeEnabled(
  measurementId: string | null | undefined,
  configured = true
): boolean {
  if (!configured || !measurementId?.startsWith("G-")) return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "false") return false;
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_GA_ENABLED !== "true") {
    return false;
  }
  return true;
}

function canTrack(measurementId?: string | null): boolean {
  const gaId = resolveGaMeasurementId(measurementId);
  if (!gaId || typeof window.gtag !== "function") return false;
  if (!hasAnalyticsConsent()) return false;
  return isAnalyticsRuntimeEnabled(gaId, true);
}

export function pageview(url: string, measurementId?: string | null) {
  const gaId = resolveGaMeasurementId(measurementId);
  if (!canTrack(gaId)) return;
  window.gtag!("config", gaId!, { page_path: url });
}

export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean | undefined>,
  measurementId?: string | null
) {
  if (!canTrack(measurementId)) return;
  window.gtag!("event", action, params);
}