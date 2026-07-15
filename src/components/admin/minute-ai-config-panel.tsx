"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { updateMinuteAiPlatformSettings } from "@/actions/minute-ai";
import type { MinuteAiAdminView } from "@/lib/minute-ai-config";

export function MinuteAiConfigPanel({ config }: { config: MinuteAiAdminView }) {
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
              ? "Clé API xAI, activation plateforme et quota mensuel par club. La variable XAI_API_KEY sert de repli."
              : "xAI API key, platform toggle and monthly quota per club. XAI_API_KEY env var is fallback."}
          </p>
        </div>
        <Badge variant={config.apiConfigured ? "success" : "muted"}>
          {config.apiConfigured
            ? isFr
              ? "Clé API configurée"
              : "API key set"
            : isFr
              ? "Clé API manquante"
              : "API key missing"}
        </Badge>
      </div>

      {config.envFallback && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
          {isFr
            ? "Clé active depuis la variable d'environnement XAI_API_KEY. Enregistrez une clé ici pour la gérer depuis l'admin."
            : "Key active from XAI_API_KEY environment variable. Save a key here to manage it from admin."}
        </p>
      )}

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
              apiKey: (fd.get("apiKey") as string) || undefined,
            });
            if ("success" in result && result.success) {
              setToast(isFr ? "Réglages IA enregistrés" : "AI settings saved");
            }
          });
        }}
        className="space-y-3 max-w-md"
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            {isFr ? "Clé API xAI" : "xAI API key"}
          </label>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={
              config.apiKeySet
                ? config.apiKeyPreview || "••••••••"
                : isFr
                  ? "xai-..."
                  : "xai-..."
            }
            className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-mono"
          />
          {config.apiKeySet && (
            <p className="text-xs text-gray-400">
              {isFr
                ? "Laisser vide pour conserver la clé actuelle"
                : "Leave empty to keep the current key"}
            </p>
          )}
        </div>

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