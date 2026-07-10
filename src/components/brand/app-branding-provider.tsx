"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_APP_NAME, type AppBranding } from "@/lib/app-settings";

const AppBrandingContext = createContext<AppBranding>({
  appName: DEFAULT_APP_NAME,
  tagline: null,
});

export function AppBrandingProvider({
  branding,
  children,
}: {
  branding: AppBranding;
  children: ReactNode;
}) {
  return (
    <AppBrandingContext.Provider value={branding}>{children}</AppBrandingContext.Provider>
  );
}

export function useAppBranding() {
  return useContext(AppBrandingContext);
}