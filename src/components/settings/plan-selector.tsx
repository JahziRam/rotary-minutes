"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Toast } from "@/components/ui/toast";
import { choosePlan } from "@/actions/subscription";
import { formatPrice, type BillingSettings, type PublicPlan } from "@/lib/plans-utils";
import { computeDiscountedPrice } from "@/lib/billing-utils";
import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import {
  PromoCodeForm,
  type AppliedPromo,
} from "@/components/subscription/promo-code-form";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics";

export function PlanSelector({
  plans,
  billing,
  locale,
  currentPlan,
  currentInterval = "MONTHLY",
}: {
  plans: PublicPlan[];
  billing: BillingSettings;
  locale: string;
  currentPlan?: SubscriptionPlan;
  currentInterval?: BillingInterval;
}) {
  const t = useTranslations("subscription");
  const [interval, setInterval] = useState<BillingInterval>(currentInterval);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isAnnual = interval === "ANNUAL";

  function discountedPrice(base: number): number {
    if (!appliedPromo) return base;
    return computeDiscountedPrice(
      base,
      appliedPromo.discountType,
      appliedPromo.discountValue
    );
  }

  const promoPreview = useMemo(() => {
    if (!appliedPromo) return null;
    return appliedPromo.discountType === "PERCENT"
      ? `${appliedPromo.discountValue}%`
      : formatPrice(appliedPromo.discountValue, billing.currency, locale);
  }, [appliedPromo, billing.currency, locale]);

  function selectPlan(planKey: SubscriptionPlan) {
    trackEvent(ANALYTICS_EVENTS.SELECT_PLAN, {
      plan: planKey,
      interval,
    });

    startTransition(async () => {
      const result = await choosePlan(
        planKey,
        interval,
        locale,
        appliedPromo?.code
      );
      if ("success" in result && result.success) {
        if ("checkoutUrl" in result && result.checkoutUrl) {
          trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
            plan: planKey,
            interval,
          });
          window.location.href = result.checkoutUrl;
          return;
        }
        setToast(result.message ?? t("planSelected"));
      } else if ("error" in result && result.error) {
        const key = [
          "NOT_FOUND",
          "INACTIVE",
          "EXPIRED",
          "NOT_YET_VALID",
          "MAX_USES_REACHED",
          "STRIPE_CHECKOUT_FAILED",
        ].includes(result.error)
          ? result.error === "STRIPE_CHECKOUT_FAILED"
            ? "stripe.checkoutFailed"
            : `promo.errors.${result.error}`
          : null;
        setToast(key ? t(key) : t("planSelected"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <PromoCodeForm
        applied={appliedPromo}
        onApplied={setAppliedPromo}
        onClear={() => setAppliedPromo(null)}
      />

      {promoPreview && (
        <p className="text-sm text-emerald-700 text-center">
          {t("promo.discountActive", { value: promoPreview })}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setInterval("MONTHLY")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              !isAnnual ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("ANNUAL")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
              isAnnual ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            {t("annual")}
            {billing.annualDiscountPercent > 0 && (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-navy">
                {t("savePercent", { percent: billing.annualDiscountPercent })}
              </span>
            )}
          </button>
        </div>
        {isAnnual && billing.annualDiscountPercent > 0 && (
          <p className="text-sm text-gray-500">{t("annualHint", { percent: billing.annualDiscountPercent })}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.plan && currentInterval === interval;
          const baseDisplayPrice = isAnnual ? plan.priceAnnualPerMonth : plan.priceMonthly;
          const baseBilledAmount = isAnnual ? plan.priceAnnual : plan.priceMonthly;
          const displayPrice = discountedPrice(baseDisplayPrice);
          const billedAmount = discountedPrice(baseBilledAmount);
          const hasDiscount = appliedPromo != null && billedAmount < baseBilledAmount;

          return (
            <div
              key={plan.plan}
              className={cn(
                "relative rounded-xl border bg-white p-5 shadow-sm flex flex-col",
                plan.isPopular ? "border-gold ring-1 ring-gold/30" : "border-gray-200",
                isCurrent && "ring-2 ring-navy/20"
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-navy-dark">
                  {t("popular")}
                </span>
              )}

              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              )}

              <div className="mt-4">
                <p className="text-2xl font-bold text-navy">
                  {formatPrice(displayPrice, billing.currency, locale)}
                  <span className="text-sm font-normal text-gray-500">/{t("perMonth")}</span>
                </p>
                {hasDiscount && (
                  <p className="text-xs text-gray-400 line-through">
                    {formatPrice(baseDisplayPrice, billing.currency, locale)}/{t("perMonth")}
                  </p>
                )}
                {isAnnual ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("billedAnnually", {
                      amount: formatPrice(billedAmount, billing.currency, locale),
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">{t("billedMonthly")}</p>
                )}
                {isAnnual && plan.annualSavings > 0 && !hasDiscount && (
                  <p className="text-xs font-medium text-emerald-600 mt-1">
                    {t("youSave", {
                      amount: formatPrice(plan.annualSavings, billing.currency, locale),
                    })}
                  </p>
                )}
                {isAnnual && (
                  <p className="text-xs text-gray-400 line-through mt-0.5">
                    {formatPrice(plan.priceMonthly * 12, billing.currency, locale)}/{t("perYear")}
                  </p>
                )}
              </div>

              <ul className="space-y-2 text-sm text-gray-600 my-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={pending || isCurrent}
                onClick={() => selectPlan(plan.plan)}
                className={cn(
                  "w-full h-10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
                  plan.isPopular
                    ? "bg-gold text-navy-dark hover:bg-gold-light"
                    : "bg-navy text-white hover:bg-navy-light",
                  isCurrent && "bg-gray-100 text-gray-500 cursor-default"
                )}
              >
                {isCurrent ? t("currentPlan") : t("choosePlan", { name: plan.name })}
              </button>
            </div>
          );
        })}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}