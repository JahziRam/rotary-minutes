"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { bulkCreateDuesForYear, markDuesPaid } from "@/actions/dues";
import type { DuesStatus } from "@/generated/prisma/client";

type DuesRow = {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  dues: {
    id: string;
    amount: number;
    currency: string;
    dueDate: string;
    paidAt: string | null;
    status: DuesStatus;
  } | null;
};

const STATUS_VARIANT: Record<DuesStatus, "success" | "warning" | "danger" | "muted"> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "danger",
  WAIVED: "muted",
};

export function DuesPanel({
  rows,
  fiscalYear,
  currency,
  defaultAnnualDues,
  canManage,
  locale,
}: {
  rows: DuesRow[];
  fiscalYear: number;
  currency: string;
  defaultAnnualDues: number | null;
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("dues");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const dateLocale = locale === "fr" ? fr : enUS;

  function run(
    action: () => Promise<{ success?: boolean; error?: string; created?: number }>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(result.created != null ? t("bulkCreated", { count: result.created }) : okMsg);
        router.refresh();
      } else if (result.error === "NO_DEFAULT_AMOUNT") {
        setToast(t("noDefaultAmount"));
      } else if (result.error === "ALREADY_PAID") {
        setToast(t("alreadyPaid"));
      }
    });
  }

  const paidCount = rows.filter((r) => r.dues?.status === "PAID").length;
  const pendingCount = rows.filter(
    (r) => r.dues && ["PENDING", "OVERDUE"].includes(r.dues.status)
  ).length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-sm text-gray-500">
              {t("fiscalYear", { year: `${fiscalYear}-${fiscalYear + 1}` })}
              {" · "}
              {t("summary", { paid: paidCount, pending: pendingCount, total: rows.length })}
            </p>
            {defaultAnnualDues != null && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t("defaultAmount", { amount: formatMoney(defaultAnnualDues, currency, locale) })}
              </p>
            )}
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="gold"
              disabled={pending}
              onClick={() =>
                run(() => bulkCreateDuesForYear({ fiscalYear }), t("bulkCreated", { count: 0 }))
              }
            >
              {t("createForYear")}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">{t("member")}</th>
                <th className="px-4 py-3 font-medium">{t("amount")}</th>
                <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                {canManage && <th className="px-4 py-3 font-medium text-right">{t("actions")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                    {t("noMembers")}
                  </td>
                </tr>
              ) : (
                rows.map(({ member, dues }) => (
                  <tr key={member.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.email && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{member.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {dues ? formatMoney(dues.amount, dues.currency, locale) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {dues ? format(new Date(dues.dueDate), "PP", { locale: dateLocale }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {dues ? (
                        <Badge variant={STATUS_VARIANT[dues.status]}>
                          {t(`statuses.${dues.status}`)}
                        </Badge>
                      ) : (
                        <Badge variant="muted">{t("notAssigned")}</Badge>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        {dues && dues.status !== "PAID" && dues.status !== "WAIVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => run(() => markDuesPaid(dues.id), t("markedPaid"))}
                          >
                            {t("markPaid")}
                          </Button>
                        )}
                        {dues?.status === "PAID" && dues.paidAt && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(dues.paidAt), "PP", { locale: dateLocale })}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}