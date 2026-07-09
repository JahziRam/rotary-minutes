import { getTranslations } from "next-intl/server";
import { getTreasuryMandateDashboard } from "@/lib/treasury-mandate-dashboard";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export async function TreasuryMandatePanel({
  clubId,
  currency,
  locale,
}: {
  clubId: string;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations("treasury.mandate");
  const data = await getTreasuryMandateDashboard(clubId);
  const fmt = (n: number) => formatBudgetMoney(n, currency, locale);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Badge variant="muted">{data.mandateLabel}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-green-50 px-3 py-2">
            <p className="text-xs text-gray-500">{t("planned")}</p>
            <p className="font-semibold text-green-800">{fmt(data.totals.planned)}</p>
          </div>
          <div className="rounded-lg bg-navy/5 px-3 py-2">
            <p className="text-xs text-gray-500">{t("actual")}</p>
            <p className="font-semibold text-navy">{fmt(data.totals.actual)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{t("variance")}</p>
            <p
              className={cn(
                "font-semibold",
                data.totals.actual - data.totals.planned >= 0 ? "text-green-700" : "text-red-700"
              )}
            >
              {fmt(data.totals.actual - data.totals.planned)}
            </p>
          </div>
        </div>

        {data.subAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-2">{t("subAccount")}</th>
                  <th className="pb-2 pr-2 text-right">{t("planned")}</th>
                  <th className="pb-2 pr-2 text-right">{t("actual")}</th>
                  <th className="pb-2 text-right">{t("variance")}</th>
                </tr>
              </thead>
              <tbody>
                {data.subAccounts.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      <span className="font-medium">{row.name}</span>
                      {row.code && (
                        <span className="text-xs text-gray-400 ml-1">({row.code})</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-600">
                      {row.planned != null ? fmt(row.planned) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right">{fmt(row.actual)}</td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium",
                        row.variance != null && row.variance >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      )}
                    >
                      {row.variance != null ? fmt(row.variance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t("noSubAccounts")}</p>
        )}

        {(data.unassigned.income > 0 || data.unassigned.expense > 0) && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            {t("unassigned", { net: fmt(data.unassigned.net) })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}