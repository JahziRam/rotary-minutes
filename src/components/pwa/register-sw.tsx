"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "@/lib/capacitor-platform";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || isCapacitorNative()) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] Service worker registration failed:", err);
    });
  }, []);

  return null;
}