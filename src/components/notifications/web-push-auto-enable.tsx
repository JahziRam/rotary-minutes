"use client";

import { WebPushEnable } from "@/components/notifications/web-push-enable";

/** Abonnement push silencieux au chargement de l'app (opt-out côté profil). */
export function WebPushAutoEnable({
  vapidPublicKey,
  preferenceEnabled,
}: {
  vapidPublicKey: string | null;
  preferenceEnabled: boolean;
}) {
  return (
    <WebPushEnable
      vapidPublicKey={vapidPublicKey}
      preferenceEnabled={preferenceEnabled}
      autoEnable
      silent
    />
  );
}