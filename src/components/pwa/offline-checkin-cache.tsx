"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

const CHECKIN_CACHE_KEY = "rotary-offline-checkins";

export type OfflineCheckIn = {
  token: string;
  meetingId: string;
  memberId?: string;
  checkedInAt: string;
};

export function getOfflineCheckIns(): OfflineCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHECKIN_CACHE_KEY);
    return raw ? (JSON.parse(raw) as OfflineCheckIn[]) : [];
  } catch {
    return [];
  }
}

export function queueOfflineCheckIn(entry: OfflineCheckIn) {
  const list = getOfflineCheckIns();
  list.push(entry);
  localStorage.setItem(CHECKIN_CACHE_KEY, JSON.stringify(list));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
        return sync?.register("check-in-sync");
      })
      .catch(() => undefined);
  }
}

export function OfflineCheckinCache({ meetingId }: { meetingId?: string }) {
  const t = useTranslations("pwa");

  useEffect(() => {
    if (!meetingId || typeof window === "undefined") return;
    const cached = getOfflineCheckIns().filter((c) => c.meetingId === meetingId);
    if (cached.length > 0) {
      console.info(`[PWA] ${cached.length} offline check-in(s) queued for meeting ${meetingId}`);
    }
  }, [meetingId]);

  return (
    <p className="text-[10px] text-gray-400 mt-2">{t("offlineCheckinHint")}</p>
  );
}