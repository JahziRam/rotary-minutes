"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateAppSettings } from "@/actions/admin-platform";
import { PRODUCTION_APP_URL } from "@/lib/analytics-constants";

interface SettingsData {
  appName: string;
  tagline: string;
  supportEmail: string;
  contactToEmail: string;
  contactBccEmail: string;
  trialDays: number;
  maintenanceMode: boolean;
  gaMeasurementId: string;
  gaConfigured: boolean;
  productionUrl: string;
}

export function AppSettingsForm({ settings }: { settings: SettingsData }) {
  const locale = useLocale();
  const t = useTranslations("admin.appSettings");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <form
        action={(fd) => {
          startTransition(async () => {
            const result = await updateAppSettings(
              {
                appName: fd.get("appName") as string,
                tagline: (fd.get("tagline") as string) || undefined,
                supportEmail: (fd.get("supportEmail") as string) || undefined,
                contactToEmail: (fd.get("contactToEmail") as string) || undefined,
                contactBccEmail: (fd.get("contactBccEmail") as string) || undefined,
                trialDays: parseInt(fd.get("trialDays") as string, 10) || 14,
                maintenanceMode: fd.get("maintenanceMode") === "on",
                gaMeasurementId: (fd.get("gaMeasurementId") as string) || "",
              },
              locale
            );
            if (result.error === "INVALID_EMAIL") {
              setToast(t("invalidEmail"));
              return;
            }
            if (result.error === "INVALID_GA_ID") {
              setToast(t("invalidGaId"));
              return;
            }
            if (result.success) setToast(t("saved"));
          });
        }}
        className="space-y-6 max-w-lg"
      >
        <div className="space-y-4">
          <Input name="appName" label={t("appName")} defaultValue={settings.appName} required />
          <Input name="tagline" label={t("tagline")} defaultValue={settings.tagline} />
          <Input
            name="supportEmail"
            type="email"
            label={t("supportEmail")}
            defaultValue={settings.supportEmail}
          />
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t("contactTitle")}</h3>
            <p className="text-sm text-gray-500 mt-1">{t("contactHint")}</p>
          </div>
          <Input
            name="contactToEmail"
            type="email"
            label={t("contactToEmail")}
            defaultValue={settings.contactToEmail}
            placeholder="contact@exemple.com"
          />
          <Input
            name="contactBccEmail"
            type="email"
            label={t("contactBccEmail")}
            defaultValue={settings.contactBccEmail}
            placeholder={t("contactBccPlaceholder")}
          />
        </div>

        <div className="space-y-4">
          <Input
            name="trialDays"
            type="number"
            label={t("trialDays")}
            defaultValue={String(settings.trialDays)}
            min={1}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} />
            {t("maintenanceMode")}
          </label>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t("gaTitle")}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {t("gaHint")}{" "}
              <a
                href="https://analytics.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2"
              >
                analytics.google.com
              </a>{" "}
              {t("gaUrlHint")}{" "}
              <code className="text-xs bg-white px-1.5 py-0.5 rounded border">
                {settings.productionUrl || PRODUCTION_APP_URL}
              </code>
              .
            </p>
          </div>
          <Input
            name="gaMeasurementId"
            label={t("gaIdLabel")}
            defaultValue={settings.gaMeasurementId}
            placeholder="G-XXXXXXXXXX"
          />
          <p className="text-xs text-gray-500">
            {settings.gaConfigured ? t("gaConfigured") : t("gaNotConfigured")}
          </p>
        </div>

        <Button type="submit" variant="gold" disabled={pending}>
          {t("save")}
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}