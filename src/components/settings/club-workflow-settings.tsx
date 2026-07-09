"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import {
  ensurePublicCalendarToken,
  updateClubWorkflowSettings,
} from "@/actions/club-settings-workflow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

interface WorkflowSettings {
  presidentApprovalRequired: boolean;
  whatsappReminderPhone: string | null;
  guideEnabled: boolean;
  publicCalendarToken: string | null;
}

export function ClubWorkflowSettings({ settings }: { settings: WorkflowSettings }) {
  const t = useTranslations("settings.workflow");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState(settings);
  const [calendarToken, setCalendarToken] = useState(settings.publicCalendarToken);

  const feedUrl = calendarToken ? `/api/public/calendar/${calendarToken}` : null;

  function save() {
    startTransition(async () => {
      const result = await updateClubWorkflowSettings({
        presidentApprovalRequired: state.presidentApprovalRequired,
        whatsappReminderPhone: state.whatsappReminderPhone,
        guideEnabled: state.guideEnabled,
      });
      if ("success" in result && result.success) setToast(t("saved"));
    });
  }

  function regenerateToken() {
    startTransition(async () => {
      const result = await ensurePublicCalendarToken(true);
      if ("success" in result && result.success) {
        setCalendarToken(result.token);
        setToast(t("tokenRegenerated"));
      }
    });
  }

  function ensureToken() {
    startTransition(async () => {
      const result = await ensurePublicCalendarToken(false);
      if ("success" in result && result.success) {
        setCalendarToken(result.token);
        setToast(t("tokenGenerated"));
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.presidentApprovalRequired}
            onChange={(e) =>
              setState((s) => ({ ...s, presidentApprovalRequired: e.target.checked }))
            }
            className="rounded border-gray-300"
          />
          {t("presidentApprovalRequired")}
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.guideEnabled}
            onChange={(e) => setState((s) => ({ ...s, guideEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          {t("guideEnabled")}
        </label>

        <Input
          label={t("whatsappReminderPhone")}
          type="tel"
          value={state.whatsappReminderPhone ?? ""}
          onChange={(e) =>
            setState((s) => ({ ...s, whatsappReminderPhone: e.target.value || null }))
          }
          placeholder="+33 6 12 34 56 78"
        />

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-900">{t("publicCalendar")}</p>
          <p className="text-xs text-gray-500">{t("publicCalendarHint")}</p>
          {feedUrl ? (
            <code className="block text-xs bg-white border border-gray-200 rounded px-2 py-1.5 break-all">
              {feedUrl}
            </code>
          ) : (
            <p className="text-xs text-gray-400">{t("noToken")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {!calendarToken && (
              <Button size="sm" variant="outline" disabled={pending} onClick={ensureToken}>
                {t("generateToken")}
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={pending} onClick={regenerateToken}>
              <RefreshCw className="h-4 w-4" />
              {t("regenerateToken")}
            </Button>
          </div>
        </div>

        <Button variant="gold" disabled={pending} onClick={save}>
          {pending ? "..." : tCommon("save")}
        </Button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}