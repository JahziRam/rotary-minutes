import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getMandateBudgetPlan } from "@/lib/queries/mandate-budget-plan";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { currentFiscalYear } from "@/lib/dues";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MandateDocumentsPanel } from "@/components/treasury/mandate-documents-panel";
import { budgetDocumentDownloadUrl, budgetDocumentViewUrl } from "@/lib/budget-document-urls";

export const dynamic = "force-dynamic";

export default async function MandatePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("mandatePlan");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "treasuryEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const year = sp.year ? parseInt(sp.year, 10) : currentFiscalYear();
  const plan = await getMandateBudgetPlan(ctx.clubId, year);
  const currency = ctx.club.currency || "EUR";
  const fmt = (n: number) => formatBudgetMoney(n, currency, locale);

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t("mandate")} {plan.mandateLabel}
            </p>
          </div>
          <Link
            href={`/${locale}/treasury`}
            className="text-sm text-navy hover:underline"
          >
            ← {t("backTreasury")}
          </Link>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{t("planned")}</p>
              <p className="text-lg font-semibold">{fmt(plan.totals.planned)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{t("income")}</p>
              <p className="text-lg font-semibold text-green-700">{fmt(plan.totals.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{t("expense")}</p>
              <p className="text-lg font-semibold text-red-700">{fmt(plan.totals.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{t("variance")}</p>
              <p
                className={`text-lg font-semibold ${
                  plan.totals.variance >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {fmt(plan.totals.variance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <BudgetTable
          title={t("subAccounts")}
          rows={plan.subAccounts}
          locale={locale}
          currency={currency}
          t={t}
        />
        <BudgetTable
          title={t("projects")}
          rows={plan.projects}
          locale={locale}
          currency={currency}
          t={t}
          hrefPrefix={`/${locale}/projects/`}
        />
        <BudgetTable
          title={t("events")}
          rows={plan.events}
          locale={locale}
          currency={currency}
          t={t}
          hrefPrefix={`/${locale}/events/`}
        />

        <MandateDocumentsPanel
          mandateYear={plan.mandateYear}
          locale={locale}
          currency={currency}
          documents={plan.mandateDocuments.map((d) => ({
            ...d,
            viewUrl: budgetDocumentViewUrl(d.id, d.mimeType),
            downloadUrl: budgetDocumentDownloadUrl(d.id),
          }))}
        />
      </div>
    </AppShellServer>
  );
}

function BudgetTable({
  title,
  rows,
  locale,
  currency,
  t,
  hrefPrefix,
}: {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    planned: number | null;
    income: number;
    expense: number;
    actual: number;
    variance: number | null;
  }>;
  locale: string;
  currency: string;
  t: (key: string) => string;
  hrefPrefix?: string;
}) {
  const fmt = (n: number) => formatBudgetMoney(n, currency, locale);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-2">{t("name")}</th>
                  <th className="pb-2 pr-2 text-right">{t("planned")}</th>
                  <th className="pb-2 pr-2 text-right">{t("actual")}</th>
                  <th className="pb-2 text-right">{t("variance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      {hrefPrefix ? (
                        <Link
                          href={`${hrefPrefix}${r.id}`}
                          className="text-navy hover:underline font-medium"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.name}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-600">
                      {r.planned != null ? fmt(r.planned) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right">{fmt(r.actual)}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        r.variance != null && r.variance >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {r.variance != null ? fmt(r.variance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
