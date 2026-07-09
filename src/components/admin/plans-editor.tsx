"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
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
  stripeEnabled,
}: {
  plans: PlanConfigData[];
  annualDiscountPercent: number;
  currency: string;
  stripeEnabled: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("admin.plans");
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
        setToast(t("billingSaved"));
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
        setToast(
          result.stripePriceWarning ? t("stripePriceChanged") : t("planSaved", { plan })
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {stripeEnabled && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p>{t("stripeWarning")}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">{t("billingTitle")}</h3>
        <p className="text-sm text-gray-500">{t("billingHint")}</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t("discountLabel")}</label>
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
            <label className="text-sm font-medium text-gray-700">{t("currencyLabel")}</label>
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
              {t("saveBilling")}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {t("billingExample", {
            annual: computeAnnualPrice(39, discount),
            discount,
          })}
        </p>
      </div>

      {plans.map((plan) => (
        <form
          key={plan.plan}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
          action={(fd) => savePlan(plan.plan, fd)}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">
              {locale === "fr" ? plan.nameFr : plan.nameEn}
              <span className="ml-2 text-xs font-normal text-gray-400">({plan.plan})</span>
            </h3>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="isActive" defaultChecked={plan.isActive} />
                {t("active")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="isPopular" defaultChecked={plan.isPopular} />
                {t("popular")}
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input name="nameFr" label={t("nameFr")} defaultValue={plan.nameFr} required />
            <Input name="nameEn" label={t("nameEn")} defaultValue={plan.nameEn} required />
            <Input
              name="descriptionFr"
              label={t("descriptionFr")}
              defaultValue={plan.descriptionFr ?? ""}
            />
            <Input
              name="descriptionEn"
              label={t("descriptionEn")}
              defaultValue={plan.descriptionEn ?? ""}
            />
            <Input
              name="priceMonthly"
              type="number"
              label={t("priceMonthly")}
              defaultValue={String(plan.priceMonthly)}
              min={0}
              required
            />
            <Input
              name="memberLimit"
              type="number"
              label={t("memberLimit")}
              defaultValue={plan.memberLimit != null ? String(plan.memberLimit) : ""}
            />
            <Input
              name="sortOrder"
              type="number"
              label={t("sortOrder")}
              defaultValue={String(plan.sortOrder)}
            />
            <Input
              name="stripePriceIdMonthly"
              label={t("stripeMonthly")}
              defaultValue={plan.stripePriceIdMonthly ?? ""}
            />
            <Input
              name="stripePriceIdAnnual"
              label={t("stripeAnnual")}
              defaultValue={plan.stripePriceIdAnnual ?? ""}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("featuresFr")}</label>
              <textarea
                name="featuresFr"
                rows={4}
                defaultValue={plan.featuresFr.join("\n")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("featuresEn")}</label>
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
              {t("savePlan", { plan: plan.plan })}
            </Button>
          </div>
        </form>
      ))}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}