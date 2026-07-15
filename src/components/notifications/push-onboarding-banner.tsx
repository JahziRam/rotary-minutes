"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  completePushOnboarding,
  savePushSubscription,
  removePushSubscription,
} from "@/actions/push-subscription";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushOnboardingBanner({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  const t = useTranslations("notifications.pushOnboarding");
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(false);
  const [pending, startTransition] = useTransition();

  const subscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const perm =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (perm !== "granted") return false;

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const json = sub.toJSON();
    const result = await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    });
    return "success" in result && result.success;
  }, [vapidPublicKey]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    setVisible(ok && Notification.permission !== "denied");
  }, []);

  if (!supported || !visible) return null;

  function keep() {
    startTransition(async () => {
      await completePushOnboarding(true);
      await subscribe();
      setVisible(false);
    });
  }

  function disable() {
    startTransition(async () => {
      await completePushOnboarding(false);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
      } catch {
        /* ignore */
      }
      setVisible(false);
    });
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-[calc(var(--sidebar-w)+1rem)] lg:right-6 z-40 max-w-xl mx-auto lg:mx-0">
      <div className="rounded-xl border border-navy/15 bg-white shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-navy shrink-0" />
            {t("title")}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t("hint")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="gold" disabled={pending} onClick={keep}>
            <Bell className="h-4 w-4" />
            {t("keep")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={disable}>
            <BellOff className="h-4 w-4" />
            {t("disable")}
          </Button>
        </div>
      </div>
    </div>
  );
}