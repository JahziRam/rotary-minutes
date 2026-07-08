"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AnalyticsConfigValue = {
  measurementId: string | null;
  enabled: boolean;
  hydrate: (measurementId: string | null, enabled: boolean) => void;
};

const AnalyticsConfigContext = createContext<AnalyticsConfigValue>({
  measurementId: null,
  enabled: false,
  hydrate: () => {},
});

export function AnalyticsConfigProvider({
  measurementId: initialId,
  enabled: initialEnabled,
  children,
}: {
  measurementId: string | null;
  enabled: boolean;
  children: ReactNode;
}) {
  const [measurementId, setMeasurementId] = useState(initialId);
  const [enabled, setEnabled] = useState(initialEnabled);

  const hydrate = useCallback((id: string | null, on: boolean) => {
    setMeasurementId(id);
    setEnabled(on);
  }, []);

  const value = useMemo(
    () => ({ measurementId, enabled, hydrate }),
    [measurementId, enabled, hydrate]
  );

  return (
    <AnalyticsConfigContext.Provider value={value}>{children}</AnalyticsConfigContext.Provider>
  );
}

export function useAnalyticsConfig() {
  return useContext(AnalyticsConfigContext);
}