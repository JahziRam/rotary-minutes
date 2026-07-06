"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateClubFeatures } from "@/actions/admin-platform";
import type { ClubFeatureSet } from "@/lib/features";

const FEATURE_MODULES: Array<{
  enabled: keyof ClubFeatureSet;
  menuVisible: keyof ClubFeatureSet;
  label: string;
  inNav: boolean;
}> = [
  { enabled: "emailsEnabled", menuVisible: "emailsMenuVisible", label: "Module emails", inNav: true },
  { enabled: "statisticsEnabled", menuVisible: "statisticsMenuVisible", label: "Statistiques", inNav: true },
  { enabled: "pdfExport", menuVisible: "pdfMenuVisible", label: "Export PDF", inNav: false },
  { enabled: "liveMeetings", menuVisible: "liveMeetingsMenuVisible", label: "Réunions en direct", inNav: false },
  { enabled: "districtDashboard", menuVisible: "districtMenuVisible", label: "Tableau district", inNav: false },
  { enabled: "offlineMode", menuVisible: "offlineMenuVisible", label: "Mode hors-ligne", inNav: false },
  { enabled: "duesEnabled", menuVisible: "duesMenuVisible", label: "Cotisations", inNav: true },
];

const API_ACCESS_KEY = "apiAccessEnabled" as const;

export function ClubFeaturesPanel({
  clubId,
  features,
}: {
  clubId: string;
  features: ClubFeatureSet;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState(features);

  function save() {
    startTransition(async () => {
      const result = await updateClubFeatures(clubId, state, locale);
      if (result.success) {
        setToast("Fonctionnalités mises à jour");
        router.refresh();
      }
    });
  }

  return (
    <div className="px-4 py-4 bg-slate-50 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-600 mb-1">Fonctionnalités du club</p>
      <p className="text-xs text-gray-400 mb-3">
        Pour chaque module désactivé, choisissez s&apos;il reste visible dans le menu du club.
      </p>
      <div className="space-y-3">
        {FEATURE_MODULES.map(({ enabled, menuVisible, label, inNav }) => {
          const isEnabled = !!state[enabled];
          return (
            <div
              key={enabled}
              className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={pending}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      [enabled]: e.target.checked,
                      ...(e.target.checked ? { [menuVisible]: false } : {}),
                    }))
                  }
                  className="rounded border-gray-300"
                />
                {label}
                <span className="text-xs font-normal text-gray-400">
                  {isEnabled ? "Activé" : "Désactivé"}
                </span>
              </label>
              {!isEnabled && (
                <label className="flex items-center gap-2 text-xs text-gray-600 pl-6">
                  <input
                    type="checkbox"
                    checked={!!state[menuVisible]}
                    disabled={pending}
                    onChange={(e) =>
                      setState((s) => ({ ...s, [menuVisible]: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  {inNav
                    ? "Afficher dans le menu du club"
                    : "Afficher dans l'interface du club (liens, boutons)"}
                </label>
              )}
            </div>
          );
        })}
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={!!state[API_ACCESS_KEY]}
              disabled={pending}
              onChange={(e) =>
                setState((s) => ({ ...s, [API_ACCESS_KEY]: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            API & webhooks
            <span className="text-xs font-normal text-gray-400">
              {state[API_ACCESS_KEY] ? "Activé" : "Désactivé"}
            </span>
          </label>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <label className="text-xs text-gray-500">Limite utilisateurs</label>
          <input
            type="number"
            min={1}
            disabled={pending}
            value={state.memberLimit ?? ""}
            placeholder="Illimité"
            onChange={(e) =>
              setState((s) => ({
                ...s,
                memberLimit: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
            }
            className="mt-1 h-8 w-full rounded border border-gray-200 text-sm px-2"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="gold" disabled={pending} onClick={save}>
          Enregistrer
        </Button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}