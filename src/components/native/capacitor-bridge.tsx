"use client";

import { useEffect } from "react";
import { getAppPlatform, isCapacitorNative } from "@/lib/capacitor-platform";

function applySafeAreaInsets() {
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  root.style.setProperty("--safe-top", cs.paddingTop || "0px");
  root.style.setProperty("--safe-right", cs.paddingRight || "0px");
  root.style.setProperty("--safe-bottom", cs.paddingBottom || "0px");
  root.style.setProperty("--safe-left", cs.paddingLeft || "0px");
  document.body.removeChild(probe);
}

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

      const platform = getAppPlatform();
      document.documentElement.classList.add("capacitor-native", `capacitor-${platform}`);
      document.body.classList.add("native-scroll");
      applySafeAreaInsets();

      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === "android") {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setBackgroundColor({ color: "#00000000" });
        } else {
          await StatusBar.setBackgroundColor({ color: "#0d2d52" });
        }
      } catch {
        // Status bar plugin may be unavailable on some WebView builds.
      }

      try {
        await SplashScreen.hide();
      } catch {
        // Splash already hidden.
      }

      const onResize = () => applySafeAreaInsets();
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));

      const onViewportResize = () => {
        const inset = Math.max(0, window.innerHeight - (window.visualViewport?.height ?? window.innerHeight));
        document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
      };
      window.visualViewport?.addEventListener("resize", onViewportResize);
      cleanups.push(() => window.visualViewport?.removeEventListener("resize", onViewportResize));

      const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.minimizeApp();
      });
      cleanups.push(() => void backHandler.remove());

      const resumeHandler = await App.addListener("appStateChange", ({ isActive }) => {
        document.documentElement.classList.toggle("app-background", !isActive);
      });
      cleanups.push(() => void resumeHandler.remove());
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      document.documentElement.classList.remove(
        "capacitor-native",
        "capacitor-android",
        "capacitor-ios",
        "app-background"
      );
      document.documentElement.style.removeProperty("--keyboard-inset");
      document.body.classList.remove("native-scroll");
    };
  }, []);

  return null;
}