import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wallet, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fiscalYearLabel, formatDuesMoney } from "@/lib/dues";
import type { getMembersDuesOverview } from "@/lib/queries/dues-overview";

type Overview = Awaited<ReturnType<typeof getMembersDuesOverview>>;

export async function MembersDuesSummary({
  overview,
  locale,
  currency,
}: {
  overview: Overview;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations("treasury");

  return (
    <Card className="border-navy/10 bg-gradient-to-r from-navy/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="font-semibold text-navy">{t("membersWidget.title")}</p>
              <p className="text-sm text-gray-500">
                {t("fiscalYear")} {fiscalYearLabel(overview.fiscalYear)} —{" "}
                {t("membersWidget.collection", { rate: overview.rate })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatDuesMoney(overview.collected, currency, locale)} /{" "}
                {formatDuesMoney(overview.expected, currency, locale)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              <span>
                {overview.paidCount} {t("membersWidget.paid")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {overview.pendingCount} {t("membersWidget.pending")}
              </span>
            </div>
            {overview.overdueCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {overview.overdueCount} {t("membersWidget.overdue")}
                </span>
              </div>
            )}
          </div>

          <Link
            href={`/${locale}/members/dues`}
            className="text-sm font-medium text-navy hover:underline shrink-0"
          >
            {t("membersWidget.manage")} →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}