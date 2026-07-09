"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  OFFLINE_CHECKIN_STORAGE_KEY,
  type OfflineCheckInEntry,
  flushOfflineCheckInQueue,
  writeOfflineCheckInsToStorage,
  readOfflineCheckInsFromStorage,
} from "@/lib/offline-check-in-sync";

export type OfflineCheckIn = OfflineCheckInEntry;

export function getOfflineCheckIns(): OfflineCheckIn[] {
  return readOfflineCheckInsFromStorage();
}

export function queueOfflineCheckIn(entry: OfflineCheckIn) {
  const list = getOfflineCheckIns();
  list.push(entry);
  writeOfflineCheckInsToStorage(list);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const sync = (
          reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          }
        ).sync;
        return sync?.register("check-in-sync");
      })
      .catch(() => undefined);
  }
}

export function OfflineCheckinCache({ meetingId }: { meetingId?: string }) {
  const t = useTranslations("pwa");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncQueued = () => {
      const cached = getOfflineCheckIns();
      if (cached.length > 0) {
        void flushOfflineCheckInQueue().then((result) => {
          if (result.synced > 0) {
            console.info(`[PWA] ${result.synced} offline check-in(s) synced`);
          }
        });
      }
    };

    if (meetingId) {
      const cached = getOfflineCheckIns().filter((c) => c.meetingId === meetingId);
      if (cached.length > 0) {
        console.info(
          `[PWA] ${cached.length} offline check-in(s) queued for meeting ${meetingId}`
        );
      }
    }

    if (navigator.onLine) syncQueued();

    const onOnline = () => syncQueued();
    window.addEventListener("online", onOnline);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_OFFLINE_CHECKINS") syncQueued();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [meetingId]);

  return (
    <p className="text-[10px] text-gray-400 mt-2">{t("offlineCheckinHint")}</p>
  );
}

export { OFFLINE_CHECKIN_STORAGE_KEY };