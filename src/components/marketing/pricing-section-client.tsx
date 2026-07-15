"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  formatPrice,
  planGridClass,
  type BillingSettings,
  type PublicPlan,
} from "@/lib/plans-utils";
import type { BillingInterval } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { PricingComparisonTable } from "./pricing-comparison-table";
import { trackPricingInterval } from "@/lib/landing-analytics";

export function PricingSectionClient({
  plans,
  billing,
  locale,
}: {
  plans: PublicPlan[];
  billing: BillingSettings;
  locale: string;
}) {
  const t = useTranslations("landing.pricing");
  const tSub = useTranslations("subscription");
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");
  const isAnnual = interval === "ANNUAL";

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => {
              setInterval("MONTHLY");
              trackPricingInterval("monthly");
            }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              !isAnnual
                ? "bg-navy text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tSub("monthly")}
          </button>
          <button
            type="button"
            onClick={() => {
              setInterval("ANNUAL");
              trackPricingInterval("annual");
            }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isAnnual
                ? "bg-navy text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tSub("annual")}
            <span className="ml-1.5 text-xs text-gold">
              {tSub("savePercent", { percent: billing.annualDiscountPercent })}
            </span>
          </button>
        </div>
      </div>

      <div className={planGridClass(plans.length)}>
        {plans.map((plan) => {
          const displayPrice = isAnnual
            ? plan.priceAnnualPerMonth
            : plan.priceMonthly;
          return (
            <div
              key={plan.plan}
              className={cn(
                "relative rounded-xl border bg-white p-6 flex flex-col",
                plan.isPopular
                  ? "border-gold shadow-md ring-1 ring-gold/30"
                  : "border-gray-200"
              )}
            >
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy-dark text-xs font-semibold px-3 py-1 rounded-full">
                  {tSub("popular")}
                </span>
              )}
              <h3 className="font-semibold text-lg text-gray-900">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              )}
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-navy">
                  {formatPrice(displayPrice, billing.currency, locale)}
                </span>
                <span className="text-gray-500 text-sm">/{tSub("perMonth")}</span>
                {isAnnual && (
                  <p className="text-xs text-gray-400 mt-1">
                    {tSub("billedAnnually", {
                      amount: formatPrice(plan.priceAnnual, billing.currency, locale),
                    })}
                  </p>
                )}
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <PricingComparisonTable plans={plans} />
    </div>
  );
}