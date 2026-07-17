"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  FileText,
  Mail,
  History,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  bulkCreateDuesForYear,
  updateMemberDuesPlan,
  sendDuesInvoiceEmail,
  sendDuesReceiptEmail,
  sendMemberDuesHistoryEmail,
  updateDuesStatus,
} from "@/actions/dues";
import { RecordDuesPayment } from "@/components/members/record-dues-payment";
import { TreasuryVoucherPanel } from "@/components/treasury/treasury-voucher-panel";
import { formatDuesMoney } from "@/lib/dues";
import type { DuesPaymentPlan, DuesStatus, PaymentMethod } from "@/generated/prisma/client";

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CHECK",
  "BANK_TRANSFER",
  "STRIPE",
  "MOBILE_MONEY",
  "OTHER",
];

type PeriodRow = {
  id: string;
  periodIndex: number;
  periodLabel: string | null;
  amount: number;
  amountPaid: number;
  remaining: number;
  currency: string;
  dueDate: string;
  paidAt: string | null;
  status: DuesStatus;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  paymentId: string | null;
};

type DuesRow = {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    duesPaymentPlan: DuesPaymentPlan;
  };
  periods: PeriodRow[];
  nextDue: PeriodRow | null;
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
  myMemberId,
  locale,
}: {
  rows: DuesRow[];
  fiscalYear: number;
  currency: string;
  defaultAnnualDues: number | null;
  canManage: boolean;
  myMemberId: string | null;
  locale: string;
}) {
  const t = useTranslations("dues");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const dateLocale = locale === "fr" ? fr : enUS;

  function run<T extends { success?: boolean; error?: string; created?: number; message?: string }>(
    action: () => Promise<T>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(
          result.created != null
            ? t("bulkCreated", { count: result.created })
            : result.message ?? okMsg
        );
        router.refresh();
      } else if (result.error === "NO_DEFAULT_AMOUNT") {
        setToast(t("noDefaultAmount"));
      } else if (result.error === "ALREADY_PAID") {
        setToast(t("alreadyPaid"));
      } else if (result.error === "NO_EMAIL") {
        setToast(t("noEmail"));
      }
    });
  }

  const paidCount = rows.filter((r) =>
    r.periods.length > 0 && r.periods.every((p) => p.status === "PAID" || p.status === "WAIVED")
  ).length;
  const pendingCount = rows.filter((r) =>
    r.periods.some((p) => ["PENDING", "OVERDUE"].includes(p.status))
  ).length;

  return (
    <>
      <div className="space-y-4" data-assist="dues-overview">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-sm text-gray-500">
              {t("fiscalYear", { year: `${fiscalYear}-${fiscalYear + 1}` })}
              {" · "}
              {t("summary", { paid: paidCount, pending: pendingCount, total: rows.length })}
            </p>
            {defaultAnnualDues != null && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t("defaultAmount", {
                  amount: formatMoney(defaultAnnualDues, currency, locale),
                })}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-8 rounded-lg border border-gray-200 px-2 text-xs"
                title={t("paymentMethod")}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`paymentMethods.${m}`)}
                  </option>
                ))}
              </select>
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
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">{t("member")}</th>
                <th className="px-4 py-3 font-medium">{t("paymentPlan")}</th>
                <th className="px-4 py-3 font-medium">{t("amount")}</th>
                <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {t("noMembers")}
                  </td>
                </tr>
              ) : (
                rows.map(({ member, periods, nextDue }) => {
                  const canEditPlan = canManage || myMemberId === member.id;
                  const isExpanded = expandedMember === member.id;
                  const displayPeriod = nextDue ?? periods[periods.length - 1] ?? null;

                  return (
                    <Fragment key={member.id}>
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          {member.email && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">
                              {member.email}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canEditPlan ? (
                            <select
                              value={member.duesPaymentPlan}
                              disabled={pending}
                              onChange={(e) =>
                                run(
                                  () =>
                                    updateMemberDuesPlan(
                                      member.id,
                                      e.target.value as DuesPaymentPlan,
                                      locale
                                    ),
                                  t("planUpdated")
                                )
                              }
                              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                            >
                              <option value="ANNUAL">{t("plans.ANNUAL")}</option>
                              <option value="MONTHLY">{t("plans.MONTHLY")}</option>
                            </select>
                          ) : (
                            <span className="text-gray-700 text-xs">
                              {t(`plans.${member.duesPaymentPlan}`)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {displayPeriod ? (
                            <>
                              <span>
                                {formatMoney(displayPeriod.amount, displayPeriod.currency, locale)}
                              </span>
                              {displayPeriod.amountPaid > 0 &&
                                displayPeriod.status !== "PAID" &&
                                displayPeriod.status !== "WAIVED" && (
                                  <p className="text-xs text-emerald-700 mt-0.5">
                                    {t("paidProgress", {
                                      paid: formatMoney(
                                        displayPeriod.amountPaid,
                                        displayPeriod.currency,
                                        locale
                                      ),
                                      total: formatMoney(
                                        displayPeriod.amount,
                                        displayPeriod.currency,
                                        locale
                                      ),
                                    })}
                                  </p>
                                )}
                            </>
                          ) : (
                            "—"
                          )}
                          {periods.length > 1 && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({periods.filter((p) => p.status === "PAID").length}/{periods.length})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {displayPeriod
                            ? format(new Date(displayPeriod.dueDate), "PP", { locale: dateLocale })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {displayPeriod ? (
                            <Badge variant={STATUS_VARIANT[displayPeriod.status]}>
                              {t(`statuses.${displayPeriod.status}`)}
                            </Badge>
                          ) : (
                            <Badge variant="muted">{t("notAssigned")}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {periods.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() =>
                                  setExpandedMember(isExpanded ? null : member.id)
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            {canManage &&
                              displayPeriod &&
                              displayPeriod.status !== "PAID" &&
                              displayPeriod.status !== "WAIVED" &&
                              displayPeriod.remaining > 0 && (
                              <>
                                <RecordDuesPayment
                                  duesId={displayPeriod.id}
                                  remaining={displayPeriod.remaining}
                                  currency={displayPeriod.currency}
                                  paymentMethod={paymentMethod}
                                  locale={locale}
                                  onToast={setToast}
                                />
                                {member.email && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    disabled={pending}
                                    onClick={() =>
                                      run(
                                        () => sendDuesInvoiceEmail(displayPeriod.id, undefined, locale),
                                        t("invoiceSent")
                                      )
                                    }
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                            {canManage && displayPeriod?.status === "PAID" && member.email && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () => sendDuesReceiptEmail(displayPeriod.id, locale),
                                    t("receiptSent")
                                  )
                                }
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                            )}
                            {canManage && member.email && periods.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () =>
                                      sendMemberDuesHistoryEmail(member.id, fiscalYear, locale),
                                    t("historySent")
                                  )
                                }
                              >
                                <History className="h-3 w-3" />
                              </Button>
                            )}
                            {periods.length > 0 && (
                              <a
                                href={`/api/dues/history/${member.id}?fiscalYear=${fiscalYear}&locale=${locale}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 text-gray-500"
                                title={t("downloadHistory")}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        periods.map((period) => (
                          <Fragment key={period.id}>
                          <tr className="bg-gray-50/80 text-xs">
                            <td className="px-4 py-2 pl-8 text-gray-500">
                              {period.periodLabel ?? `#${period.periodIndex}`}
                            </td>
                            <td />
                            <td className="px-4 py-2">
                              <span>
                                {formatMoney(period.amount, period.currency, locale)}
                              </span>
                              {period.amountPaid > 0 &&
                                period.status !== "PAID" &&
                                period.status !== "WAIVED" && (
                                  <p className="text-[10px] text-emerald-700">
                                    {t("paidProgress", {
                                      paid: formatMoney(
                                        period.amountPaid,
                                        period.currency,
                                        locale
                                      ),
                                      total: formatMoney(
                                        period.amount,
                                        period.currency,
                                        locale
                                      ),
                                    })}
                                  </p>
                                )}
                            </td>
                            <td className="px-4 py-2">
                              {format(new Date(period.dueDate), "PP", { locale: dateLocale })}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant={STATUS_VARIANT[period.status]} className="text-[10px]">
                                {t(`statuses.${period.status}`)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {canManage && (
                                <div className="flex justify-end gap-1">
                                  {period.status !== "PAID" &&
                                    period.status !== "WAIVED" &&
                                    period.remaining > 0 && (
                                    <>
                                      <RecordDuesPayment
                                        duesId={period.id}
                                        remaining={period.remaining}
                                        currency={period.currency}
                                        paymentMethod={paymentMethod}
                                        locale={locale}
                                        compact
                                        onToast={setToast}
                                      />
                                      <a
                                        href={`/api/dues/invoice/${period.id}?locale=${locale}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center h-6 px-2 text-[10px] text-navy hover:underline"
                                      >
                                        PDF
                                      </a>
                                      {member.email && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] px-1"
                                          disabled={pending}
                                          onClick={() =>
                                            run(
                                              () =>
                                                sendDuesInvoiceEmail(period.id, undefined, locale),
                                              t("invoiceSent")
                                            )
                                          }
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {period.status === "PAID" && (
                                    <>
                                      <a
                                        href={`/api/dues/receipt/${period.id}?locale=${locale}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center h-6 px-2 text-[10px] text-navy hover:underline"
                                      >
                                        PDF
                                      </a>
                                      {member.email && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] px-1"
                                          disabled={pending}
                                          onClick={() =>
                                            run(
                                              () => sendDuesReceiptEmail(period.id, locale),
                                              t("receiptSent")
                                            )
                                          }
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {period.status === "PENDING" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-[10px] px-2 text-gray-400"
                                      disabled={pending}
                                      onClick={() =>
                                        run(
                                          () => updateDuesStatus(period.id, "WAIVED"),
                                          t("waived")
                                        )
                                      }
                                    >
                                      {t("waive")}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                          {period.paymentId && canManage && (
                            <tr className="bg-gray-50/60">
                              <td colSpan={6} className="px-4 py-3 pl-8">
                                <TreasuryVoucherPanel
                                  entity={{ type: "duesPayment", id: period.paymentId }}
                                  canManage={canManage}
                                  compact
                                  defaultKind="PAYMENT_PROOF"
                                />
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        ))}
                    </Fragment>
                  );
                })
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
  return formatDuesMoney(amount, currency, locale);
}