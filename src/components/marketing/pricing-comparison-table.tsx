"use client";

import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";
import {
  getPlanComparisonMatrix,
  type ComparisonRowKey,
  type ComparisonValue,
} from "@/lib/plan-comparison";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import type { PublicPlan } from "@/lib/plans-utils";
import { cn } from "@/lib/utils";

const ROWS: ComparisonRowKey[] = [
  "members",
  "minutesPdf",
  "liveMeetings",
  "dues",
  "treasury",
  "emails",
  "statistics",
  "events",
  "attendance",
  "district",
  "api",
  "offline",
  "governance",
  "integrations",
];

function CellValue({ value, membersLabel }: { value: ComparisonValue; membersLabel: string }) {
  if (typeof value === "string") {
    if (value === "unlimited") {
      return <span className="text-xs font-medium text-navy">{membersLabel}</span>;
    }
    return <span className="text-xs font-medium text-gray-700">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-gold mx-auto" aria-label="yes" />
  ) : (
    <Minus className="h-4 w-4 text-gray-300 mx-auto" aria-label="no" />
  );
}

export function PricingComparisonTable({ plans }: { plans: PublicPlan[] }) {
  const t = useTranslations("landing.pricing.compare");
  const orderedPlans = plans;
  const memberLimits = Object.fromEntries(
    orderedPlans.map((plan) => [plan.plan, plan.memberLimit])
  ) as Partial<Record<SubscriptionPlan, number | null>>;
  const matrix = getPlanComparisonMatrix(memberLimits);

  if (orderedPlans.length === 0) return null;

  return (
    <div className="mt-12 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[40%]">
              {t("feature")}
            </th>
            {orderedPlans.map((plan) => (
              <th
                key={plan.plan}
                className={cn(
                  "px-3 py-3 text-center font-semibold text-gray-900",
                  plan.isPopular && "bg-gold/5"
                )}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-2.5 text-gray-600">{t(`rows.${row}`)}</td>
              {orderedPlans.map((plan) => (
                <td
                  key={`${row}-${plan.plan}`}
                  className={cn("px-3 py-2.5 text-center", plan.isPopular && "bg-gold/[0.03]")}
                >
                  <CellValue
                    value={matrix[row][plan.plan]}
                    membersLabel={t("unlimited")}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}