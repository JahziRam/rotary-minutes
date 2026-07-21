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
import {
  MINUTE_MEMBER_PHOTO_SIZES,
  MINUTE_MEMBER_PHOTO_SIZE_SPECS,
  parseMinuteMemberPhotoSize,
  type MinuteMemberPhotoSize,
} from "@/lib/minute-member-photo-size";

interface WorkflowSettings {
  presidentApprovalRequired: boolean;
  whatsappReminderPhone: string | null;
  guideEnabled: boolean;
  minuteShowMemberPhotos: boolean;
  minuteMemberPhotoSize?: string | null;
  publicCalendarToken: string | null;
}

export function ClubWorkflowSettings({ settings }: { settings: WorkflowSettings }) {
  const t = useTranslations("settings.workflow");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState({
    ...settings,
    minuteMemberPhotoSize: parseMinuteMemberPhotoSize(settings.minuteMemberPhotoSize),
  });
  const [calendarToken, setCalendarToken] = useState(settings.publicCalendarToken);

  const feedUrl = calendarToken ? `/api/public/calendar/${calendarToken}` : null;

  function save() {
    startTransition(async () => {
      const result = await updateClubWorkflowSettings({
        presidentApprovalRequired: state.presidentApprovalRequired,
        whatsappReminderPhone: state.whatsappReminderPhone,
        guideEnabled: state.guideEnabled,
        minuteShowMemberPhotos: state.minuteShowMemberPhotos,
        minuteMemberPhotoSize: state.minuteMemberPhotoSize,
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

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.minuteShowMemberPhotos}
            onChange={(e) =>
              setState((s) => ({ ...s, minuteShowMemberPhotos: e.target.checked }))
            }
            className="mt-0.5 rounded border-gray-300"
          />
          <span>
            <span className="font-medium">{t("minuteShowMemberPhotos")}</span>
            <span className="block text-xs text-gray-500">{t("minuteShowMemberPhotosHint")}</span>
          </span>
        </label>

        {state.minuteShowMemberPhotos && (
          <div className="ml-6 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{t("minuteMemberPhotoSize")}</p>
            <p className="text-xs text-gray-500">{t("minuteMemberPhotoSizeHint")}</p>
            <div className="flex flex-wrap gap-3">
              {MINUTE_MEMBER_PHOTO_SIZES.map((size) => {
                const px = MINUTE_MEMBER_PHOTO_SIZE_SPECS[size].previewPx;
                const selected = state.minuteMemberPhotoSize === size;
                return (
                  <label
                    key={size}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? "border-navy bg-white ring-2 ring-navy/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="minuteMemberPhotoSize"
                      value={size}
                      checked={selected}
                      onChange={() =>
                        setState((s) => ({
                          ...s,
                          minuteMemberPhotoSize: size as MinuteMemberPhotoSize,
                        }))
                      }
                      className="sr-only"
                    />
                    <span
                      className="shrink-0 rounded-full bg-gray-200 ring-1 ring-gray-300"
                      style={{ width: px, height: px }}
                      aria-hidden
                    />
                    <span className="font-medium text-gray-800">
                      {t(`minuteMemberPhotoSize${size}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

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