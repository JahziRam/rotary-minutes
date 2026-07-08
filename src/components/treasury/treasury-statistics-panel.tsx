import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { getTreasuryDashboardData } from "@/lib/queries/treasury";
import { getMembersDuesOverview } from "@/lib/queries/dues-overview";
import { formatBudgetMoney } from "@/lib/budget-utils";

export async function TreasuryStatisticsPanel({
  clubId,
  locale,
  currency,
}: {
  clubId: string;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations("treasury");
  const [stats, dues] = await Promise.all([
    getTreasuryDashboardData(clubId, locale),
    getMembersDuesOverview(clubId),
  ]);

  const maxMonthly = Math.max(
    1,
    ...stats.monthlyBreakdown.map((m) => Math.max(m.income, m.expense))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{t("statisticsSection.title")}</h2>
        <Link href={`/${locale}/treasury`} className="text-sm text-navy hover:underline">
          {t("statisticsSection.viewAll")} →
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        {t("fiscalYear")} {stats.fiscalYearLabel}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("balance")}
          value={formatBudgetMoney(stats.summary.balance, currency, locale)}
          icon={Wallet}
        />
        <StatCard
          title={t("income")}
          value={formatBudgetMoney(stats.summary.income, currency, locale)}
          icon={ArrowDownLeft}
          trend="up"
        />
        <StatCard
          title={t("expense")}
          value={formatBudgetMoney(stats.summary.expense, currency, locale)}
          icon={ArrowUpRight}
          trend="down"
        />
        <StatCard title={t("duesCollection")} value={`${dues.rate}%`} icon={Wallet} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("monthlyChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
              {stats.monthlyBreakdown.map((m) => (
                <div key={m.month} className="flex flex-col items-center gap-1 min-w-[2rem]">
                  <div className="flex items-end gap-0.5 h-24">
                    <div
                      className="w-2 bg-emerald-500 rounded-t"
                      style={{
                        height: `${(m.income / maxMonthly) * 100}%`,
                        minHeight: m.income ? 4 : 0,
                      }}
                    />
                    <div
                      className="w-2 bg-red-400 rounded-t"
                      style={{
                        height: `${(m.expense / maxMonthly) * 100}%`,
                        minHeight: m.expense ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 capitalize">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("byCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[...stats.incomeByCategory, ...stats.expensesByCategory].length === 0 ? (
              <p className="text-gray-500">{t("noEntries")}</p>
            ) : (
              [...stats.incomeByCategory, ...stats.expensesByCategory].map((c) => (
                <div key={c.id} className="flex justify-between">
                  <span className="text-gray-700">{c.label}</span>
                  <span className="font-medium">
                    {formatBudgetMoney(c.total, currency, locale)}
                  </span>
                </div>
              ))
            )}
            {dues.overdueCount > 0 && (
              <p className="text-amber-700 text-xs pt-2 border-t border-gray-100">
                {t("statisticsSection.overdue", { count: dues.overdueCount })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}