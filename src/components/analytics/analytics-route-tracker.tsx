"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/analytics";
import { useAnalyticsConfig } from "./analytics-config-provider";

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { measurementId } = useAnalyticsConfig();

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    pageview(url, measurementId);
  }, [pathname, searchParams, measurementId]);

  return null;
}

export function AnalyticsRouteTracker() {
  return (
    <Suspense fallback={null}>
      <RouteTracker />
    </Suspense>
  );
}