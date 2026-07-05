"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateAppSettings } from "@/actions/admin-platform";

interface SettingsData {
  appName: string;
  tagline: string;
  supportEmail: string;
  trialDays: number;
  maintenanceMode: boolean;
}

export function AppSettingsForm({ settings }: { settings: SettingsData }) {
  const locale = useLocale();
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
                trialDays: parseInt(fd.get("trialDays") as string, 10) || 14,
                maintenanceMode: fd.get("maintenanceMode") === "on",
              },
              locale
            );
            if (result.success) setToast("Paramètres enregistrés");
          });
        }}
        className="space-y-4 max-w-lg"
      >
        <Input name="appName" label="Nom de l'application" defaultValue={settings.appName} required />
        <Input name="tagline" label="Slogan" defaultValue={settings.tagline} />
        <Input name="supportEmail" type="email" label="Email support" defaultValue={settings.supportEmail} />
        <Input name="trialDays" type="number" label="Jours d'essai gratuit" defaultValue={String(settings.trialDays)} min={1} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} />
          Mode maintenance
        </label>
        <Button type="submit" variant="gold" disabled={pending}>
          Enregistrer
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}