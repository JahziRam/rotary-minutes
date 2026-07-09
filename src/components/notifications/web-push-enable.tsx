"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePushSubscription, removePushSubscription } from "@/actions/push-subscription";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function WebPushEnable({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const t = useTranslations("notifications.push");
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub);
    });
  }, []);

  if (!supported || !vapidPublicKey) return null;

  function enable() {
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });

      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if ("success" in result && result.success) setEnabled(true);
    });
  }

  function disable() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
    });
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Bell className="h-4 w-4 text-navy" />
          {t("title")}
        </p>
        <p className="text-xs text-gray-500 mt-1">{t("hint")}</p>
      </div>
      <Button
        size="sm"
        variant={enabled ? "outline" : "gold"}
        disabled={pending}
        onClick={enabled ? disable : enable}
      >
        {enabled ? (
          <>
            <BellOff className="h-4 w-4" />
            {t("disable")}
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            {t("enable")}
          </>
        )}
      </Button>
    </div>
  );
}