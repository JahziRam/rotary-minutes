"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerListPagination } from "@/components/ui/list-controls";
import { getPlanLabel } from "@/lib/feature-gate";
import { formatPrice } from "@/lib/plans-utils";
import type { AdminBillingSummary } from "@/lib/queries/admin-billing";
import type { PaginatedResult } from "@/lib/server-list";

type PaymentRow = {
  id: string;
  clubName: string;
  clubCity: string | null;
  kind: string;
  amountCents: number;
  currency: string;
  status: string;
  plan: string | null;
  billingInterval: string | null;
  paidAt: Date;
};

function formatMoney(cents: number, currency: string, locale: string) {
  return formatPrice(cents / 100, currency, locale);
}

export function BillingReport({
  summary,
  payments,
  initialQuery,
  listParams,
  planLabels,
}: {
  summary: AdminBillingSummary;
  payments: PaginatedResult<PaymentRow>;
  initialQuery: string;
  listParams: Record<string, string | undefined>;
  planLabels: Record<string, string>;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("adminBilling");
  const dateLocale = locale === "fr" ? fr : enUS;
  const basePath = `/${locale}/admin/billing`;

  function applySearch(fd: FormData) {
    const q = (fd.get("q") as string)?.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("totalRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(summary.totalRevenueCents, "EUR", locale)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("paymentCount", { count: summary.paymentCount })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("monthRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(summary.monthRevenueCents, "EUR", locale)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("monthPaymentCount", { count: summary.monthPaymentCount })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("activeSubscriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{summary.activeSubscriptions}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t("trialing", { count: summary.trialingSubscriptions })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t("subscriptionsByPlan")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {summary.byPlan.map((row) => (
                <li key={row.plan} className="flex justify-between gap-2">
                  <span>{getPlanLabel(row.plan as never, locale, planLabels)}</span>
                  <span className="font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("monthlyTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("month")}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t("revenue")}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t("payments")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.recentMonths.map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2">{row.month}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(row.revenueCents, "EUR", locale)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">{t("paymentsTitle")}</CardTitle>
          <form action={applySearch} className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q"
              type="search"
              defaultValue={initialQuery}
              placeholder={t("searchPlaceholder")}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm"
            />
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("club")}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("date")}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("plan")}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("kind")}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t("amount")}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      {t("noPayments")}
                    </td>
                  </tr>
                ) : (
                  payments.items.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        {p.clubName}
                        {p.clubCity ? ` · ${p.clubCity}` : ""}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {format(new Date(p.paidAt), "d MMM yyyy HH:mm", { locale: dateLocale })}
                      </td>
                      <td className="px-3 py-2">
                        {p.plan ? getPlanLabel(p.plan as never, locale, planLabels) : "—"}
                        {p.billingInterval
                          ? ` · ${p.billingInterval === "ANNUAL" ? t("annual") : t("monthly")}`
                          : ""}
                      </td>
                      <td className="px-3 py-2">{p.kind}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(p.amountCents, p.currency, locale)}
                      </td>
                      <td className="px-3 py-2">{p.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ServerListPagination
            basePath={basePath}
            page={payments.page}
            totalPages={payments.totalPages}
            total={payments.total}
            start={payments.start}
            end={payments.end}
            searchParams={listParams}
          />
          <p className="text-xs text-gray-500 mt-4">
            {t("managePlans")}{" "}
            <Link href={`/${locale}/admin/subscriptions`} className="text-navy hover:underline">
              {t("subscriptionsLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}