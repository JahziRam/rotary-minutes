"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updatePreferences } from "@/actions/notification-preferences";
import type { NotificationFrequency } from "@/generated/prisma/client";

const FREQUENCIES: NotificationFrequency[] = [
  "IMMEDIATE",
  "DAILY",
  "WEEKLY",
  "OFF",
];

const CATEGORIES = [
  "meetingReminders",
  "duesReminders",
  "actionReminders",
  "birthdayReminders",
  "eventReminders",
] as const;

type PrefsState = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  webPushEnabled: boolean;
  meetingReminders: NotificationFrequency;
  duesReminders: NotificationFrequency;
  actionReminders: NotificationFrequency;
  birthdayReminders: NotificationFrequency;
  eventReminders: NotificationFrequency;
};

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: PrefsState;
}) {
  const t = useTranslations("notificationPreferences");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState(preferences);

  function save() {
    startTransition(async () => {
      const result = await updatePreferences(state, locale);
      if ("success" in result && result.success) {
        setToast(t("saved"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.emailEnabled}
            disabled={pending}
            onChange={(e) => setState((s) => ({ ...s, emailEnabled: e.target.checked }))}
          />
          {t("emailEnabled")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.inAppEnabled}
            disabled={pending}
            onChange={(e) => setState((s) => ({ ...s, inAppEnabled: e.target.checked }))}
          />
          {t("inAppEnabled")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.webPushEnabled}
            disabled={pending}
            onChange={(e) => setState((s) => ({ ...s, webPushEnabled: e.target.checked }))}
          />
          {t("webPushEnabled")}
        </label>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((key) => (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3"
          >
            <span className="text-sm font-medium text-gray-800">{t(`categories.${key}`)}</span>
            <select
              value={state[key]}
              disabled={pending}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  [key]: e.target.value as NotificationFrequency,
                }))
              }
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {t(`frequencies.${f}`)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="gold" disabled={pending} onClick={save}>
          {t("save")}
        </Button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}