"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const t = useTranslations("offline");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav-total)+0.75rem)] left-1/2 -translate-x-1/2 z-50 lg:bottom-4">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-navy text-white text-sm shadow-lg border border-gold/30">
        <WifiOff className="h-4 w-4 text-gold" />
        <span>{t("offline")}</span>
        <span className="text-white/60 text-xs hidden sm:inline">— {t("draftSaved")}</span>
      </div>
    </div>
  );
}