"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateFeatureFlag } from "@/actions/feature-flags";

type FlagRow = {
  key: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  defaultEnabled: boolean;
  rolloutPercent: number;
  isActive: boolean;
  _count: { overrides: number };
};

export function FeatureFlagsPanel({ flags }: { flags: FlagRow[] }) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function saveFlag(flag: FlagRow, form: FormData) {
    startTransition(async () => {
      const result = await updateFeatureFlag(
        flag.key,
        {
          nameFr: form.get("nameFr") as string,
          nameEn: form.get("nameEn") as string,
          descriptionFr: (form.get("descriptionFr") as string) || null,
          descriptionEn: (form.get("descriptionEn") as string) || null,
          defaultEnabled: form.get("defaultEnabled") === "on",
          rolloutPercent: parseInt(form.get("rolloutPercent") as string, 10) || 0,
          isActive: form.get("isActive") === "on",
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast("Feature flag enregistré");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Déploiement progressif par pourcentage de clubs ou override par club depuis la fiche club.
      </p>
      {flags.map((flag) => (
        <form
          key={flag.key}
          action={(fd) => saveFlag(flag, fd)}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="text-xs font-mono text-navy bg-gray-50 px-2 py-1 rounded">
              {flag.key}
            </code>
            <span className="text-xs text-gray-400">
              {flag._count.overrides} override{flag._count.overrides !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input name="nameFr" label="Nom FR" defaultValue={flag.nameFr} required />
            <Input name="nameEn" label="Nom EN" defaultValue={flag.nameEn} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              name="descriptionFr"
              label="Description FR"
              defaultValue={flag.descriptionFr ?? ""}
            />
            <Input
              name="descriptionEn"
              label="Description EN"
              defaultValue={flag.descriptionEn ?? ""}
            />
          </div>
          <Input
            name="rolloutPercent"
            type="number"
            label="Rollout global (%)"
            defaultValue={String(flag.rolloutPercent)}
            min={0}
            max={100}
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="defaultEnabled"
                defaultChecked={flag.defaultEnabled}
              />
              Activé par défaut
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={flag.isActive} />
              Flag actif
            </label>
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Enregistrer
          </Button>
        </form>
      ))}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}