"use client";

import { useEffect, useState } from "react";
import {
  getAppPlatform,
  isCapacitorNative,
  type AppPlatform,
} from "@/lib/capacitor-platform";

export function useNativeApp() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<AppPlatform>("web");

  useEffect(() => {
    setIsNative(isCapacitorNative());
    setPlatform(getAppPlatform());
  }, []);

  return {
    isNative,
    platform,
    isAndroid: platform === "android",
  };
}