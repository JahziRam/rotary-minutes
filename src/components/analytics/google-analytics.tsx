"use client";

import { useEffect } from "react";
import { pageview } from "@/lib/analytics";
import { useCookieConsent } from "./cookie-consent-provider";
import { useAnalyticsConfig } from "./analytics-config-provider";
import { AnalyticsRouteTracker } from "./analytics-route-tracker";

function loadGtagScript(gaId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Analytics"));
    document.head.appendChild(script);
  });
}

function initGtag(gaId: string) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
  window.gtag("js", new Date());
  window.gtag("config", gaId, { send_page_view: false });
}

function updateConsentMode(granted: boolean) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function GoogleAnalytics() {
  const { consent } = useCookieConsent();
  const { measurementId, enabled } = useAnalyticsConfig();

  useEffect(() => {
    if (!enabled || !measurementId) return;

    const granted = consent?.analytics === true;
    updateConsentMode(granted);
    if (!granted) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGtagScript(measurementId);
        if (cancelled) return;
        initGtag(measurementId);
        const path = window.location.pathname + window.location.search;
        pageview(path, measurementId);
      } catch {
        // Analytics blocked or failed to load
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consent?.analytics, enabled, measurementId]);

  useEffect(() => {
    const onConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<{ analytics: boolean }>).detail;
      updateConsentMode(detail.analytics);
    };
    window.addEventListener("rm:cookie-consent", onConsentChange);
    return () => window.removeEventListener("rm:cookie-consent", onConsentChange);
  }, []);

  if (!enabled || consent?.analytics !== true) return null;

  return <AnalyticsRouteTracker />;
}