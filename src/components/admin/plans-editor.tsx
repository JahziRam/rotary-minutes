"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateBillingSettings, updatePlanConfig } from "@/actions/admin-platform";
import { computeAnnualPrice, type PlanConfigData } from "@/lib/plans-utils";
import type { SubscriptionPlan } from "@/generated/prisma/client";

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function PlansEditor({
  plans,
  annualDiscountPercent,
  currency,
}: {
  plans: PlanConfigData[];
  annualDiscountPercent: number;
  currency: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [discount, setDiscount] = useState(annualDiscountPercent);
  const [currencyVal, setCurrencyVal] = useState(currency);

  function saveBilling() {
    startTransition(async () => {
      const result = await updateBillingSettings(
        { annualDiscountPercent: discount, currency: currencyVal },
        locale
      );
      if (result.success) {
        setToast("Paramètres de facturation enregistrés");
        router.refresh();
      }
    });
  }

  function savePlan(plan: SubscriptionPlan, fd: FormData) {
    startTransition(async () => {
      const result = await updatePlanConfig(
        plan,
        {
          nameFr: fd.get("nameFr") as string,
          nameEn: fd.get("nameEn") as string,
          descriptionFr: (fd.get("descriptionFr") as string) || undefined,
          descriptionEn: (fd.get("descriptionEn") as string) || undefined,
          priceMonthly: parseInt(fd.get("priceMonthly") as string, 10) || 0,
          featuresFr: parseLines(fd.get("featuresFr") as string),
          featuresEn: parseLines(fd.get("featuresEn") as string),
          stripePriceIdMonthly: (fd.get("stripePriceIdMonthly") as string) || undefined,
          stripePriceIdAnnual: (fd.get("stripePriceIdAnnual") as string) || undefined,
          memberLimit: fd.get("memberLimit")
            ? parseInt(fd.get("memberLimit") as string, 10)
            : null,
          isActive: fd.get("isActive") === "on",
          isPopular: fd.get("isPopular") === "on",
          sortOrder: parseInt(fd.get("sortOrder") as string, 10) || 0,
        },
        locale
      );
      if (result.success) {
        setToast(`Offre ${plan} enregistrée`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Facturation annuelle</h3>
        <p className="text-sm text-gray-500">
          Réduction appliquée au paiement annuel (en % du total 12 mois).
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Réduction annuelle (%)</label>
            <input
              type="number"
              min={0}
              max={90}
              value={discount}
              disabled={pending}
              onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
              className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Devise</label>
            <input
              type="text"
              value={currencyVal}
              disabled={pending}
              onChange={(e) => setCurrencyVal(e.target.value.toUpperCase())}
              className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button variant="gold" disabled={pending} onClick={saveBilling}>
              Enregistrer la réduction
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Exemple : 39€/mois → {computeAnnualPrice(39, discount)}€/an (−{discount}%)
        </p>
      </div>

      {plans.map((plan) => (
        <form
          key={plan.plan}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
          action={(fd) => savePlan(plan.plan, fd)}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">{plan.plan}</h3>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="isActive" defaultChecked={plan.isActive} />
                Actif
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="isPopular" defaultChecked={plan.isPopular} />
                Populaire
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input name="nameFr" label="Nom (FR)" defaultValue={plan.nameFr} required />
            <Input name="nameEn" label="Nom (EN)" defaultValue={plan.nameEn} required />
            <Input name="descriptionFr" label="Description (FR)" defaultValue={plan.descriptionFr ?? ""} />
            <Input name="descriptionEn" label="Description (EN)" defaultValue={plan.descriptionEn ?? ""} />
            <Input
              name="priceMonthly"
              type="number"
              label="Prix mensuel"
              defaultValue={String(plan.priceMonthly)}
              min={0}
              required
            />
            <Input
              name="memberLimit"
              type="number"
              label="Limite membres (vide = illimité)"
              defaultValue={plan.memberLimit != null ? String(plan.memberLimit) : ""}
            />
            <Input name="sortOrder" type="number" label="Ordre" defaultValue={String(plan.sortOrder)} />
            <Input
              name="stripePriceIdMonthly"
              label="Stripe Price ID (mensuel)"
              defaultValue={plan.stripePriceIdMonthly ?? ""}
            />
            <Input
              name="stripePriceIdAnnual"
              label="Stripe Price ID (annuel)"
              defaultValue={plan.stripePriceIdAnnual ?? ""}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Fonctionnalités (FR, une par ligne)</label>
              <textarea
                name="featuresFr"
                rows={4}
                defaultValue={plan.featuresFr.join("\n")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Fonctionnalités (EN, une par ligne)</label>
              <textarea
                name="featuresEn"
                rows={4}
                defaultValue={plan.featuresEn.join("\n")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="gold" disabled={pending}>
              Enregistrer {plan.plan}
            </Button>
          </div>
        </form>
      ))}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}