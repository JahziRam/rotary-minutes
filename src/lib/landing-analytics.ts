"use client";

import { trackEvent } from "@/lib/analytics";
import { LANDING_ANALYTICS_EVENTS } from "@/lib/analytics-events";

export type LandingCtaLocation =
  | "hero"
  | "header"
  | "pricing"
  | "final_cta"
  | "footer"
  | "mobile_nav";

export type LandingCtaTarget = "register" | "demo" | "contact" | "login" | "pricing";

export function trackLandingCta(
  location: LandingCtaLocation,
  target: LandingCtaTarget,
  extra?: Record<string, string>
) {
  trackEvent(LANDING_ANALYTICS_EVENTS.CTA_CLICK, {
    location,
    target,
    ...extra,
  });
}

export function trackContactFormOpen() {
  trackEvent(LANDING_ANALYTICS_EVENTS.CONTACT_OPEN);
}

export function trackContactFormSubmit(result: "success" | string) {
  trackEvent(LANDING_ANALYTICS_EVENTS.CONTACT_SUBMIT, {
    result,
  });
}

export function trackPricingView() {
  trackEvent(LANDING_ANALYTICS_EVENTS.PRICING_VIEW);
}

export function trackPricingInterval(interval: "monthly" | "annual") {
  trackEvent(LANDING_ANALYTICS_EVENTS.PRICING_INTERVAL, { interval });
}