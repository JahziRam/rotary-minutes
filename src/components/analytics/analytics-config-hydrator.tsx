"use client";

import { useEffect } from "react";
import { useAnalyticsConfig } from "./analytics-config-provider";

/** Loads GA measurement ID from DB (admin override) after first paint. */
export function AnalyticsConfigHydrator() {
  const { hydrate } = useAnalyticsConfig();

  useEffect(() => {
    fetch("/api/analytics-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { measurementId?: string | null; enabled?: boolean } | null) => {
        if (data) hydrate(data.measurementId ?? null, Boolean(data.enabled));
      })
      .catch(() => {});
  }, [hydrate]);

  return null;
}