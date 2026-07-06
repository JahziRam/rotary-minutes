"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateDuesSettings } from "@/actions/dues";

interface DuesSettingsData {
  defaultAnnualDues: number | null;
  currency: string;
  duesAutoInvoiceEmail: boolean;
  duesAutoReceiptEmail: boolean;
}

export function DuesSettingsForm({ settings }: { settings: DuesSettingsData }) {
  const t = useTranslations("dues.settings");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState(settings);

  function save() {
    startTransition(async () => {
      const result = await updateDuesSettings({
        defaultAnnualDues: state.defaultAnnualDues,
        currency: state.currency,
        duesAutoInvoiceEmail: state.duesAutoInvoiceEmail,
        duesAutoReceiptEmail: state.duesAutoReceiptEmail,
      });
      if ("success" in result && result.success) setToast(t("saved"));
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t("defaultAnnualDues")}
            type="number"
            min={0}
            step="0.01"
            value={state.defaultAnnualDues ?? ""}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                defaultAnnualDues: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
          />
          <Input
            label={t("currency")}
            value={state.currency}
            onChange={(e) => setState((s) => ({ ...s, currency: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.duesAutoInvoiceEmail}
            onChange={(e) =>
              setState((s) => ({ ...s, duesAutoInvoiceEmail: e.target.checked }))
            }
            className="rounded border-gray-300"
          />
          {t("autoInvoiceEmail")}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.duesAutoReceiptEmail}
            onChange={(e) =>
              setState((s) => ({ ...s, duesAutoReceiptEmail: e.target.checked }))
            }
            className="rounded border-gray-300"
          />
          {t("autoReceiptEmail")}
        </label>
        <Button variant="gold" disabled={pending} onClick={save}>
          {pending ? "..." : tCommon("save")}
        </Button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}