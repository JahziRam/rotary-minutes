"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { updateAddonConfig, deactivateClubAddon } from "@/actions/billing";
import type { AddonKey } from "@/generated/prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type AddonConfigRow = {
  key: AddonKey;
  nameFr: string;
  nameEn: string;
  priceMonthly: number;
  stripePriceId: string | null;
  isActive: boolean;
};

type ClubAddonRow = {
  id: string;
  addonKey: AddonKey;
  activatedAt: string | Date;
  expiresAt: string | Date | null;
  club: { id: string; name: string; city: string };
};

export function AddonsEditor({
  addons,
  clubAddons,
}: {
  addons: AddonConfigRow[];
  clubAddons: ClubAddonRow[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function saveAddon(key: AddonKey, fd: FormData) {
    startTransition(async () => {
      const result = await updateAddonConfig(
        key,
        {
          nameFr: fd.get("nameFr") as string,
          nameEn: fd.get("nameEn") as string,
          priceMonthly: parseInt(fd.get("priceMonthly") as string, 10) || 0,
          stripePriceId: (fd.get("stripePriceId") as string) || null,
          isActive: fd.get("isActive") === "on",
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast(`Addon ${key} enregistré`);
        router.refresh();
      }
    });
  }

  function removeClubAddon(clubId: string, addonKey: AddonKey) {
    if (!confirm("Retirer cet addon pour ce club ?")) return;
    startTransition(async () => {
      await deactivateClubAddon(clubId, addonKey, locale);
      setToast("Addon retiré");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Configuration des addons</h3>
        {addons.map((addon) => (
          <form
            key={addon.key}
            onSubmit={(e) => {
              e.preventDefault();
              saveAddon(addon.key, new FormData(e.currentTarget));
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border border-gray-200"
          >
            <div className="sm:col-span-2 lg:col-span-4">
              <span className="text-xs font-mono text-gray-500">{addon.key}</span>
            </div>
            <Input name="nameFr" label="Nom FR" defaultValue={addon.nameFr} required />
            <Input name="nameEn" label="Nom EN" defaultValue={addon.nameEn} required />
            <Input
              name="priceMonthly"
              label="Prix / mois (€)"
              type="number"
              defaultValue={addon.priceMonthly}
              required
            />
            <Input
              name="stripePriceId"
              label="Stripe Price ID"
              defaultValue={addon.stripePriceId ?? ""}
              placeholder="price_..."
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={addon.isActive}
                className="rounded"
              />
              Actif
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm" disabled={pending}>
                Enregistrer
              </Button>
            </div>
          </form>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Addons activés par club</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Club</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Addon</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Activé</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Expire</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clubAddons.map((ca) => (
                <tr key={ca.id}>
                  <td className="px-3 py-2">
                    {ca.club.name}
                    <span className="text-gray-400"> · {ca.club.city}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="default">{ca.addonKey}</Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {format(new Date(ca.activatedAt), "d MMM yyyy", { locale: fr })}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {ca.expiresAt
                      ? format(new Date(ca.expiresAt), "d MMM yyyy", { locale: fr })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeClubAddon(ca.club.id, ca.addonKey)}
                      disabled={pending}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
              {clubAddons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Aucun addon activé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}