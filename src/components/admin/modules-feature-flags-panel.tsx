"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateDefaultClubFeatures } from "@/actions/feature-flags";
import {
  CLUB_FEATURE_KEYS,
  CLUB_FEATURE_LABELS,
  type ClubFeatureSet,
} from "@/lib/feature-definitions";

export function ModulesFeatureFlagsPanel({
  defaults,
}: {
  defaults: ClubFeatureSet;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState<ClubFeatureSet>(defaults);

  function toggleKey(key: keyof ClubFeatureSet, value: boolean | number | null) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateDefaultClubFeatures(state, locale);
      if ("success" in result && result.success) {
        setToast("Modules par défaut enregistrés");
        router.refresh();
      } else if ("error" in result) {
        setToast(`Erreur : ${result.error}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Valeurs par défaut appliquées aux nouveaux clubs. Les clubs existants conservent leurs
        réglages ; modifiez-les depuis la fiche club (vue développée).
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {CLUB_FEATURE_KEYS.map((key) => {
          const labels = CLUB_FEATURE_LABELS[key];
          const label = locale === "fr" ? labels.fr : labels.en;

          if (key === "memberLimit") {
            return (
              <div
                key={key}
                className="rounded-lg border border-gray-200 bg-white p-3 sm:col-span-2 lg:col-span-3"
              >
                <label className="text-xs text-gray-500">{label}</label>
                <input
                  type="number"
                  min={1}
                  disabled={pending}
                  value={state.memberLimit ?? ""}
                  placeholder={locale === "fr" ? "Illimité" : "Unlimited"}
                  onChange={(e) =>
                    toggleKey(
                      "memberLimit",
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )
                  }
                  className="mt-1 h-8 w-full max-w-xs rounded border border-gray-200 text-sm px-2"
                />
              </div>
            );
          }

          const checked = !!state[key];
          return (
            <label
              key={key}
              className="flex items-center gap-2 text-sm p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={pending}
                onChange={(e) => toggleKey(key, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>
                <span className="font-medium text-gray-800">{label}</span>
                <code className="block text-[10px] text-gray-400 font-mono mt-0.5">{key}</code>
              </span>
            </label>
          );
        })}
      </div>
      <Button size="sm" variant="gold" disabled={pending} onClick={save}>
        Enregistrer les modules par défaut
      </Button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}