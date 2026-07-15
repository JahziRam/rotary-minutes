"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateComparisonOverrides } from "@/actions/admin-platform";
import {
  getPlanComparisonMatrix,
  type ComparisonRowKey,
} from "@/lib/plan-comparison";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import type {
  ComparisonOverrides,
  ComparisonOverrideValue,
  PlanConfigData,
} from "@/lib/plans-utils";

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

function cellKey(row: ComparisonRowKey, plan: SubscriptionPlan) {
  return `${row}:${plan}`;
}

function parseBoolOverride(raw: string): boolean | undefined {
  if (raw === "default") return undefined;
  return raw === "true";
}

function parseMembersOverride(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "default") return undefined;
  return trimmed;
}

export function ComparisonOverridesEditor({
  plans,
  overrides: initialOverrides,
}: {
  plans: PlanConfigData[];
  overrides: ComparisonOverrides;
}) {
  const locale = useLocale();
  const t = useTranslations("admin.plans.comparison");
  const tCompare = useTranslations("landing.pricing.compare");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ComparisonOverrides>(initialOverrides);

  const memberLimits = Object.fromEntries(
    plans.map((p) => [p.plan, p.memberLimit])
  ) as Partial<Record<SubscriptionPlan, number | null>>;
  const defaults = getPlanComparisonMatrix(memberLimits);

  function getEffective(
    row: ComparisonRowKey,
    plan: SubscriptionPlan
  ): ComparisonOverrideValue {
    return overrides[row]?.[plan] ?? defaults[row][plan];
  }

  function setOverride(
    row: ComparisonRowKey,
    plan: SubscriptionPlan,
    value: ComparisonOverrideValue | undefined
  ) {
    setOverrides((prev) => {
      const rowOverrides = { ...(prev[row] ?? {}) };
      if (value === undefined) {
        delete rowOverrides[plan];
      } else {
        rowOverrides[plan] = value;
      }
      const next = { ...prev };
      if (Object.keys(rowOverrides).length === 0) {
        delete next[row];
      } else {
        next[row] = rowOverrides;
      }
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updateComparisonOverrides(overrides, locale);
      if (result.success) {
        setToast(t("saved"));
      }
    });
  }

  function resetAll() {
    setOverrides({});
    startTransition(async () => {
      const result = await updateComparisonOverrides({}, locale);
      if (result.success) setToast(t("reset"));
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">{t("title")}</h3>
        <p className="text-sm text-gray-500 mt-1">{t("hint")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-[30%]">
                {tCompare("feature")}
              </th>
              {plans.map((plan) => (
                <th key={plan.plan} className="px-2 py-2 text-center font-medium text-gray-800">
                  {locale === "fr" ? plan.nameFr : plan.nameEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row} className="border-b border-gray-50">
                <td className="px-3 py-2 text-gray-600">{tCompare(`rows.${row}`)}</td>
                {plans.map((plan) => {
                  const effective = getEffective(row, plan.plan);
                  const hasOverride = overrides[row]?.[plan.plan] !== undefined;
                  return (
                    <td key={cellKey(row, plan.plan)} className="px-2 py-2 text-center">
                      {row === "members" ? (
                        <input
                          type="text"
                          disabled={pending}
                          placeholder={
                            typeof effective === "string"
                              ? effective === "unlimited"
                                ? tCompare("unlimited")
                                : effective
                              : ""
                          }
                          defaultValue={
                            hasOverride && typeof overrides[row]?.[plan.plan] === "string"
                              ? String(overrides[row]![plan.plan])
                              : ""
                          }
                          onBlur={(e) => {
                            const parsed = parseMembersOverride(e.target.value);
                            setOverride(row, plan.plan, parsed);
                          }}
                          className="w-full h-8 rounded border border-gray-200 px-2 text-xs text-center"
                          title={t("membersHint")}
                        />
                      ) : (
                        <select
                          disabled={pending}
                          value={
                            hasOverride
                              ? String(overrides[row]![plan.plan])
                              : "default"
                          }
                          onChange={(e) => {
                            const parsed = parseBoolOverride(e.target.value);
                            setOverride(row, plan.plan, parsed);
                          }}
                          className="h-8 rounded border border-gray-200 px-1 text-xs"
                        >
                          <option value="default">
                            {effective ? "✓" : "—"} ({t("default")})
                          </option>
                          <option value="true">✓</option>
                          <option value="false">—</option>
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button variant="gold" disabled={pending} onClick={save}>
          {t("save")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={resetAll}>
          {t("resetDefaults")}
        </Button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}