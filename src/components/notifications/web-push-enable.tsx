"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  savePushSubscription,
  removePushSubscription,
  setWebPushPreference,
} from "@/actions/push-subscription";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type WebPushEnableProps = {
  vapidPublicKey: string | null;
  /** Préférence utilisateur (activée par défaut). */
  preferenceEnabled?: boolean;
  /** Tente l'abonnement automatiquement au chargement si la préférence est active. */
  autoEnable?: boolean;
  /** Masquer le bandeau (auto-abonnement silencieux uniquement). */
  silent?: boolean;
};

export function WebPushEnable({
  vapidPublicKey,
  preferenceEnabled = true,
  autoEnable = false,
  silent = false,
}: WebPushEnableProps) {
  const t = useTranslations("notifications.push");
  const [supported, setSupported] = useState(false);
  const [browserSubscribed, setBrowserSubscribed] = useState(false);
  const [prefEnabled, setPrefEnabled] = useState(preferenceEnabled);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [pending, startTransition] = useTransition();

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const perm =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (perm !== "granted") {
        setPermission(perm);
        return false;
      }
      setPermission("granted");
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
    if ("success" in result && result.success) {
      setBrowserSubscribed(true);
      return true;
    }
    return false;
  }, [vapidPublicKey]);

  useEffect(() => {
    setPrefEnabled(preferenceEnabled);
  }, [preferenceEnabled]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setBrowserSubscribed(!!sub);
    });
  }, []);

  useEffect(() => {
    if (!autoEnable || !supported || !vapidPublicKey || !prefEnabled) return;
    if (browserSubscribed) return;

    const key = "push-auto-attempted";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    void (async () => {
      if (Notification.permission === "denied") return;
      await subscribe();
    })();
  }, [autoEnable, supported, vapidPublicKey, prefEnabled, browserSubscribed, subscribe]);

  if (!supported || !vapidPublicKey) return null;
  if (silent) return null;

  const needsBrowserPermission =
    prefEnabled && !browserSubscribed && permission !== "granted";

  function turnOn() {
    startTransition(async () => {
      await setWebPushPreference(true);
      setPrefEnabled(true);
      await subscribe();
    });
  }

  function turnOff() {
    startTransition(async () => {
      await setWebPushPreference(false);
      setPrefEnabled(false);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setBrowserSubscribed(false);
    });
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
          {prefEnabled ? (
            <Bell className="h-4 w-4 text-navy" />
          ) : (
            <BellOff className="h-4 w-4 text-gray-400" />
          )}
          {t("title")}
        </p>
        <p className="text-xs text-gray-500 mt-1">{t("hint")}</p>
        {needsBrowserPermission && (
          <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {t("browserPermission")}
          </p>
        )}
        {permission === "denied" && prefEnabled && (
          <p className="text-xs text-amber-700 mt-2">{t("browserDenied")}</p>
        )}
      </div>
      <Button
        size="sm"
        variant={prefEnabled ? "outline" : "gold"}
        disabled={pending}
        onClick={prefEnabled ? turnOff : turnOn}
      >
        {prefEnabled ? (
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