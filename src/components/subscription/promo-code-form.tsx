"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { applyPromoCode } from "@/actions/billing";
import type { PromoDiscountType } from "@/generated/prisma/client";

export type AppliedPromo = {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
};

export function PromoCodeForm({
  onApplied,
  onClear,
  applied,
}: {
  onApplied: (promo: AppliedPromo) => void;
  onClear: () => void;
  applied: AppliedPromo | null;
}) {
  const t = useTranslations("subscription");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const result = await applyPromoCode(code);
      if ("error" in result) {
        setError(t(`promo.errors.${result.error}`));
        return;
      }
      if ("promo" in result) {
        onApplied(result.promo);
        setCode("");
      }
    });
  }

  if (applied) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm text-emerald-800">
          {t("promo.applied", {
            code: applied.code,
            value:
              applied.discountType === "PERCENT"
                ? `${applied.discountValue}%`
                : `${applied.discountValue}`,
          })}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          {t("promo.remove")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">{t("promo.title")}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("promo.placeholder")}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={pending || !code.trim()}
          className="shrink-0"
        >
          {pending ? t("promo.applying") : t("promo.apply")}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}