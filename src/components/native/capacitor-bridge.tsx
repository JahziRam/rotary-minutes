"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "@/lib/capacitor-platform";

/**
 * Initialise le shell natif Capacitor (barre de statut, bouton retour Android).
 */
export function CapacitorBridge() {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const [{ StatusBar, Style }, { App }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
      ]);

      if (cancelled) return;

      document.documentElement.classList.add("capacitor-native");
      document.body.classList.add("safe-top", "native-scroll");

      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0d2d52" });
      } catch {
        // Status bar plugin may be unavailable on some WebView builds.
      }

      try {
        await SplashScreen.hide();
      } catch {
        // Splash already hidden.
      }

      const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.minimizeApp();
      });
      cleanups.push(() => void backHandler.remove());

      const resumeHandler = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          document.documentElement.classList.remove("app-background");
        } else {
          document.documentElement.classList.add("app-background");
        }
      });
      cleanups.push(() => void resumeHandler.remove());
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      document.documentElement.classList.remove("capacitor-native", "app-background");
      document.body.classList.remove("safe-top", "native-scroll");
    };
  }, []);

  return null;
}