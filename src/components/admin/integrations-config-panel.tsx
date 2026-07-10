"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { CreditCard, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import {
  updateIntegrationSettings,
  testStripeConnection,
  testResendConnection,
} from "@/actions/admin-platform";
import type { IntegrationAdminView } from "@/lib/platform-integrations";
import { useAppBranding } from "@/components/brand/app-branding-provider";

export function IntegrationsConfigPanel({
  integration,
}: {
  integration: IntegrationAdminView;
}) {
  const locale = useLocale();
  const { appName } = useAppBranding();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(integration.stripeEnabled);
  const [resendEnabled, setResendEnabled] = useState(integration.resendEnabled);

  function saveStripe(form: FormData) {
    startTransition(async () => {
      const result = await updateIntegrationSettings(
        {
          stripeSecretKey: (form.get("stripeSecretKey") as string) || undefined,
          stripePublishableKey:
            (form.get("stripePublishableKey") as string) || undefined,
          stripeWebhookSecret:
            (form.get("stripeWebhookSecret") as string) || undefined,
          stripeEnabled,
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast("Configuration Stripe enregistrée");
      }
    });
  }

  function saveResend(form: FormData) {
    startTransition(async () => {
      const result = await updateIntegrationSettings(
        {
          resendApiKey: (form.get("resendApiKey") as string) || undefined,
          emailFrom: (form.get("emailFrom") as string) || undefined,
          resendEnabled,
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast("Configuration Resend enregistrée");
      }
    });
  }

  function runStripeTest() {
    startTransition(async () => {
      const result = await testStripeConnection();
      if ("success" in result && result.success) {
        setToast(result.message ?? "Stripe OK");
      } else if ("message" in result && result.message) {
        setToast(result.message);
      } else {
        setToast("Échec du test Stripe — vérifiez les clés");
      }
    });
  }

  function runResendTest() {
    startTransition(async () => {
      const result = await testResendConnection();
      if ("success" in result && result.success) {
        setToast(result.message ?? "Resend OK");
      } else if ("message" in result && result.message) {
        setToast(result.message);
      } else {
        setToast("Échec du test Resend — vérifiez la clé API");
      }
    });
  }

  return (
    <div className="space-y-6 mt-8 pt-8 border-t border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Intégrations</h3>
        <p className="text-sm text-gray-500 mt-1">
          Clés stockées de façon sécurisée en base. Les variables .env servent de
          repli si un champ est vide.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Stripe */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-navy" />
              <h4 className="font-medium text-gray-900">Stripe</h4>
            </div>
            <Badge variant={integration.stripeConfigured ? "success" : "warning"}>
              {integration.stripeConfigured ? "Configuré" : "Incomplet"}
            </Badge>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripeEnabled}
              onChange={(e) => setStripeEnabled(e.target.checked)}
            />
            Paiement Stripe activé pour les clubs
          </label>

          <form action={saveStripe} className="space-y-3">
            <Input
              name="stripeSecretKey"
              type="password"
              label="Clé secrète (sk_live_… / sk_test_…)"
              placeholder={
                integration.stripeSecretKeySet
                  ? "Laisser vide pour conserver la valeur actuelle"
                  : "sk_test_..."
              }
              autoComplete="off"
            />
            <Input
              name="stripePublishableKey"
              label="Clé publique (pk_live_… / pk_test_…)"
              placeholder={
                integration.stripePublishableKeySet
                  ? `Actuelle : ${integration.stripePublishableKeyPreview || "configurée"}`
                  : "pk_test_..."
              }
              autoComplete="off"
            />
            <Input
              name="stripeWebhookSecret"
              type="password"
              label="Secret webhook (whsec_…)"
              placeholder={
                integration.stripeWebhookSecretSet
                  ? "Laisser vide pour conserver la valeur actuelle"
                  : "whsec_..."
              }
              autoComplete="off"
            />
            <p className="text-xs text-gray-500">
              URL webhook Stripe :{" "}
              <code className="bg-gray-50 px-1 rounded break-all">
                {integration.webhookUrl}
              </code>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" variant="gold" disabled={pending}>
                Enregistrer Stripe
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !integration.stripeConfigured}
                onClick={runStripeTest}
              >
                Tester la connexion
              </Button>
            </div>
          </form>
        </div>

        {/* Resend */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-navy" />
              <h4 className="font-medium text-gray-900">Resend</h4>
            </div>
            <Badge variant={integration.resendConfigured ? "success" : "warning"}>
              {integration.resendConfigured ? "Configuré" : "Incomplet"}
            </Badge>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resendEnabled}
              onChange={(e) => setResendEnabled(e.target.checked)}
            />
            Envoi d&apos;emails Resend activé
          </label>

          <form action={saveResend} className="space-y-3">
            <Input
              name="resendApiKey"
              type="password"
              label="Clé API Resend (re_…)"
              placeholder={
                integration.resendApiKeySet
                  ? "Laisser vide pour conserver la valeur actuelle"
                  : "re_..."
              }
              autoComplete="off"
            />
            <Input
              name="emailFrom"
              label="Expéditeur (From)"
              defaultValue={integration.emailFrom}
              placeholder={`${appName} <noreply@votredomaine.com>`}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" variant="gold" disabled={pending}>
                Enregistrer Resend
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !integration.resendConfigured}
                onClick={runResendTest}
              >
                Tester la connexion
              </Button>
            </div>
          </form>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}