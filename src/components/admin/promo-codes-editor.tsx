"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { createPromoCode, updatePromoCode, deletePromoCode } from "@/actions/billing";
import type { PromoDiscountType } from "@/generated/prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type PromoRow = {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  validFrom: string | Date;
  validUntil: string | Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
};

export function PromoCodesEditor({ promos }: { promos: PromoRow[] }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function saveNew(fd: FormData) {
    startTransition(async () => {
      const result = await createPromoCode(
        {
          code: fd.get("code") as string,
          discountType: fd.get("discountType") as PromoDiscountType,
          discountValue: parseInt(fd.get("discountValue") as string, 10) || 0,
          validUntil: (fd.get("validUntil") as string) || null,
          maxUses: fd.get("maxUses")
            ? parseInt(fd.get("maxUses") as string, 10)
            : null,
          isActive: fd.get("isActive") === "on",
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast("Code promo créé");
        setShowForm(false);
        router.refresh();
      } else if ("error" in result) {
        setToast(result.error === "CODE_EXISTS" ? "Code déjà utilisé" : "Erreur");
      }
    });
  }

  function toggleActive(promo: PromoRow) {
    startTransition(async () => {
      await updatePromoCode(promo.id, { isActive: !promo.isActive }, locale);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    startTransition(async () => {
      await deletePromoCode(id, locale);
      setToast("Code supprimé");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          {promos.length} code{promos.length !== 1 ? "s" : ""} promo
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "Nouveau code"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveNew(new FormData(e.currentTarget));
          }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50"
        >
          <Input name="code" label="Code" required placeholder="WELCOME20" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              name="discountType"
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
              defaultValue="PERCENT"
            >
              <option value="PERCENT">Pourcentage</option>
              <option value="FIXED_AMOUNT">Montant fixe</option>
            </select>
          </div>
          <Input name="discountValue" label="Valeur" type="number" required defaultValue={20} />
          <Input name="validUntil" label="Valide jusqu'au" type="date" />
          <Input name="maxUses" label="Utilisations max" type="number" placeholder="Illimité" />
          <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
            <input name="isActive" type="checkbox" defaultChecked className="rounded" />
            Actif
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>
              Créer
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Réduction</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Utilisations</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Validité</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {promos.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-mono font-medium">{p.code}</td>
                <td className="px-3 py-2">
                  {p.discountType === "PERCENT" ? `${p.discountValue}%` : `${p.discountValue} €`}
                </td>
                <td className="px-3 py-2">
                  {p.usedCount}
                  {p.maxUses != null ? ` / ${p.maxUses}` : ""}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {p.validUntil
                    ? format(new Date(p.validUntil), "d MMM yyyy", { locale: fr })
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={p.isActive ? "success" : "default"}>
                    {p.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    disabled={pending}
                    className="text-navy hover:underline text-xs"
                  >
                    {p.isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={pending}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {promos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Aucun code promo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}