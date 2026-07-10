/** Client-safe helpers for Capacitor / native shell detection. */

export type AppPlatform = "web" | "android" | "ios";

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function getAppPlatform(): AppPlatform {
  if (typeof window === "undefined") return "web";
  const cap = (window as Window & {
    Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
  }).Capacitor;
  if (!cap?.isNativePlatform?.()) return "web";
  const platform = cap.getPlatform?.();
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";
  return "web";
}

export function isAndroidApp(): boolean {
  return getAppPlatform() === "android";
}