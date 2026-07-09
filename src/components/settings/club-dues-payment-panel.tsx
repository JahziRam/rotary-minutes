"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateClubDuesPaymentSettings } from "@/actions/club-dues-payment-settings";

interface DuesPaymentSettings {
  stripeEnabled: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  paymentInstructions: string;
  webhookUrl: string;
}

export function ClubDuesPaymentPanel({ settings }: { settings: DuesPaymentSettings }) {
  const t = useTranslations("dues.onlinePayment");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState({
    stripeEnabled: settings.stripeEnabled,
    paymentInstructions: settings.paymentInstructions,
  });
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  function save() {
    startTransition(async () => {
      const result = await updateClubDuesPaymentSettings({
        stripeEnabled: state.stripeEnabled,
        stripeSecretKey: secretKey || undefined,
        stripeWebhookSecret: webhookSecret || undefined,
        paymentInstructions: state.paymentInstructions,
      });
      if ("success" in result && result.success) {
        setSecretKey("");
        setWebhookSecret("");
        setToast(t("saved"));
      } else if ("error" in result && result.error === "STRIPE_KEY_REQUIRED") {
        setToast(t("keyRequired"));
      } else {
        setToast(t("error"));
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 flex items-start gap-2">
          <CreditCard className="h-4 w-4 text-navy mt-0.5 shrink-0" />
          {t("hint")}
        </p>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.stripeEnabled}
            onChange={(e) => setState((s) => ({ ...s, stripeEnabled: e.target.checked }))}
            className="rounded border-gray-300"
          />
          {t("enableStripe")}
        </label>

        {state.stripeEnabled && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Input
              label={t("secretKey")}
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={
                settings.hasSecretKey ? t("secretKeyPlaceholderSet") : t("secretKeyPlaceholder")
              }
              autoComplete="off"
            />
            <Input
              label={t("webhookSecret")}
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={
                settings.hasWebhookSecret
                  ? t("webhookSecretPlaceholderSet")
                  : t("webhookSecretPlaceholder")
              }
              autoComplete="off"
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">{t("webhookUrl")}</p>
              <code className="block text-xs bg-white border border-gray-200 rounded px-2 py-1.5 break-all">
                {settings.webhookUrl}
              </code>
              <p className="text-xs text-gray-500">{t("webhookHint")}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("instructions")}
          </label>
          <textarea
            value={state.paymentInstructions}
            onChange={(e) =>
              setState((s) => ({ ...s, paymentInstructions: e.target.value }))
            }
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder={t("instructionsPlaceholder")}
          />
          <p className="text-xs text-gray-500 mt-1">{t("instructionsHint")}</p>
        </div>

        <Button variant="gold" disabled={pending} onClick={save}>
          {pending ? "..." : tCommon("save")}
        </Button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}