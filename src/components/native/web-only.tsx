"use client";

import { useNativeApp } from "@/hooks/use-native-app";

/** Renders children only in the browser / PWA — hidden inside Capacitor APK. */
export function WebOnly({ children }: { children: React.ReactNode }) {
  const { isNative } = useNativeApp();
  if (isNative) return null;
  return <>{children}</>;
}