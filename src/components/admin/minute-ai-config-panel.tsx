"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { updateMinuteAiPlatformSettings } from "@/actions/minute-ai";
import type { MinuteAiPlatformConfig } from "@/lib/minute-ai-config";

export function MinuteAiConfigPanel({
  config,
  apiConfigured,
}: {
  config: MinuteAiPlatformConfig;
  apiConfigured: boolean;
}) {
  const locale = useLocale();
  const isFr = locale === "fr";
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [globallyEnabled, setGloballyEnabled] = useState(config.globallyEnabled);

  return (
    <div className="mt-8 rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            {isFr ? "Assistant IA — rédaction PV" : "AI assistant — minutes"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isFr
              ? "Activation plateforme et quota mensuel par club. La clé API est définie via XAI_API_KEY."
              : "Platform toggle and monthly quota per club. API key is set via XAI_API_KEY."}
          </p>
        </div>
        <Badge variant={apiConfigured ? "success" : "muted"}>
          {apiConfigured
            ? isFr
              ? "Clé API détectée"
              : "API key set"
            : isFr
              ? "Clé API manquante"
              : "API key missing"}
        </Badge>
      </div>

      <form
        action={(fd) => {
          startTransition(async () => {
            const result = await updateMinuteAiPlatformSettings({
              globallyEnabled: fd.get("globallyEnabled") === "on",
              monthlyQuotaPerClub: parseInt(
                (fd.get("monthlyQuotaPerClub") as string) || "50",
                10
              ),
              model: (fd.get("model") as string) || undefined,
            });
            if ("success" in result && result.success) {
              setToast(isFr ? "Réglages IA enregistrés" : "AI settings saved");
            }
          });
        }}
        className="space-y-3 max-w-md"
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="globallyEnabled"
            checked={globallyEnabled}
            onChange={(e) => setGloballyEnabled(e.target.checked)}
          />
          {isFr ? "Activer l'assistant IA sur la plateforme" : "Enable AI assistant platform-wide"}
        </label>
        <Input
          name="monthlyQuotaPerClub"
          type="number"
          min={1}
          max={500}
          label={isFr ? "Quota mensuel par club" : "Monthly quota per club"}
          defaultValue={String(config.monthlyQuotaPerClub)}
        />
        <Input
          name="model"
          label={isFr ? "Modèle xAI" : "xAI model"}
          defaultValue={config.model}
          placeholder="grok-3-mini"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {isFr ? "Enregistrer" : "Save"}
        </Button>
      </form>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}