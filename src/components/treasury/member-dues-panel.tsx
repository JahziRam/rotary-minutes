import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMemberDuesHistory } from "@/lib/queries/dues-overview";
import { fiscalYearLabel, formatDuesMoney } from "@/lib/dues";
import type { DuesStatus } from "@/generated/prisma/client";

const VARIANT: Record<DuesStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAIVED: "muted",
};

export async function MemberDuesPanel({
  clubId,
  memberId,
  locale,
  showDuesLink,
}: {
  clubId: string;
  memberId: string;
  locale: string;
  showDuesLink?: boolean;
}) {
  const t = await getTranslations("treasury");
  const tDues = await getTranslations("dues");
  const data = await getMemberDuesHistory(clubId, memberId);
  const dateLocale = locale === "fr" ? fr : enUS;

  if (data.currentPeriods.length === 0 && data.payments.length === 0) return null;

  const amountDue = data.currentPeriods.reduce((s, p) => s + Number(p.amount), 0);
  const amountPaid = data.currentPeriods
    .filter((p) => p.status === "PAID" || p.status === "WAIVED")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {t("memberPortal.title")}
        </CardTitle>
        {showDuesLink && (
          <Link href={`/${locale}/members/dues`} className="text-sm text-navy hover:underline">
            {t("memberPortal.viewDues")}
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {data.currentPeriods.length > 0 && (
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <p className="text-sm text-gray-500">
              {t("fiscalYear")} {fiscalYearLabel(data.currentYear)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs text-gray-500">{tDues("amount")}</p>
                <p className="font-semibold text-navy">
                  {formatDuesMoney(amountDue, data.currency, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{tDues("paid")}</p>
                <p className="font-semibold text-emerald-700">
                  {formatDuesMoney(amountPaid, data.currency, locale)}
                </p>
              </div>
              <Badge variant={VARIANT[data.aggregateStatus]}>
                {tDues(`statuses.${data.aggregateStatus}`)}
              </Badge>
            </div>
          </div>
        )}

        {data.payments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t("memberPortal.paymentHistory")}
            </p>
            <ul className="space-y-2">
              {data.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b border-gray-100 pb-2"
                >
                  <div>
                    <p className="text-gray-900">
                      {formatDuesMoney(Number(p.amount), p.currency, locale)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(p.paidAt, "PP", { locale: dateLocale })}
                      {p.receiptNumber ? ` · ${p.receiptNumber}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}