"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Download, FileText, Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { createEntry, deleteEntry } from "@/actions/treasury";
import type { BudgetEntryType } from "@/generated/prisma/client";

type EntryRow = {
  id: string;
  type: BudgetEntryType;
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  duesPaymentId: string | null;
  duesMemberName: string | null;
  actionId: string | null;
  actionTitle: string | null;
  reference: string | null;
};

type Category = { id: string; name: string; type: BudgetEntryType };
type EventOption = { id: string; title: string };

export function TreasuryPanel({
  entries,
  categories,
  events,
  summary,
  currency,
  canManage,
  locale,
  initialEventId,
}: {
  entries: EntryRow[];
  categories: Category[];
  events: EventOption[];
  summary: { income: number; expense: number; balance: number };
  currency: string;
  canManage: boolean;
  locale: string;
  initialEventId?: string;
}) {
  const t = useTranslations("treasury");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState(initialEventId ?? "");
  const [typeFilter, setTypeFilter] = useState<"" | BudgetEntryType>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "EXPENSE" as BudgetEntryType,
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    categoryId: "",
    eventId: "",
  });
  const dateLocale = locale === "fr" ? fr : enUS;

  const filtered = entries.filter((e) => {
    if (eventFilter && e.eventId !== eventFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });

  function formatMoney(amount: number) {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function run<T extends { success?: boolean; error?: string }>(
    action: () => Promise<T>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(okMsg);
        router.refresh();
      }
    });
  }

  const queryParams = new URLSearchParams();
  if (eventFilter) queryParams.set("eventId", eventFilter);
  if (typeFilter) queryParams.set("type", typeFilter);
  const qs = queryParams.toString();

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("income")}</p>
            <p className="text-xl font-bold text-green-600">{formatMoney(summary.income)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("expense")}</p>
            <p className="text-xl font-bold text-red-600">{formatMoney(summary.expense)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("balance")}</p>
            <p className="text-xl font-bold text-navy">{formatMoney(summary.balance)}</p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">{t("allEvents")}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | BudgetEntryType)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">{t("allTypes")}</option>
              <option value="INCOME">{t("types.INCOME")}</option>
              <option value="EXPENSE">{t("types.EXPENSE")}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/treasury/report?locale=${locale}${qs ? `&${qs}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline">
                <FileText className="h-4 w-4 mr-1" />
                {t("downloadPdf")}
              </Button>
            </a>
            <a
              href={`/api/treasury/export?${qs}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                {t("exportCsv")}
              </Button>
            </a>
            {canManage && (
              <Button size="sm" variant="gold" onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("addEntry")}
              </Button>
            )}
          </div>
        </div>

        {showForm && canManage && (
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as BudgetEntryType })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="INCOME">{t("types.INCOME")}</option>
                <option value="EXPENSE">{t("types.EXPENSE")}</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder={t("amount")}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">{t("noCategory")}</option>
                {categories
                  .filter((c) => c.type === form.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <input
              type="text"
              placeholder={t("description")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
            <select
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="">{t("noEvent")}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="gold"
              disabled={pending || !form.amount || !form.description}
              onClick={() =>
                run(
                  () =>
                    createEntry({
                      type: form.type,
                      amount: parseFloat(form.amount),
                      date: form.date,
                      description: form.description,
                      categoryId: form.categoryId || undefined,
                      eventId: form.eventId || undefined,
                    }),
                  t("entryCreated")
                )
              }
            >
              {t("saveEntry")}
            </Button>
          </Card>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">{t("date")}</th>
                <th className="px-4 py-3 font-medium">{t("type")}</th>
                <th className="px-4 py-3 font-medium">{t("description")}</th>
                <th className="px-4 py-3 font-medium">{t("amount")}</th>
                <th className="px-4 py-3 font-medium">{t("links")}</th>
                {canManage && (
                  <th className="px-4 py-3 font-medium text-right">{t("actions")}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    {t("noEntries")}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">
                      {format(new Date(entry.date), "PP", { locale: dateLocale })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.type === "INCOME" ? "success" : "danger"}>
                        {t(`types.${entry.type}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{entry.description}</p>
                      {entry.categoryName && (
                        <p className="text-xs text-gray-400">{entry.categoryName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className={entry.type === "INCOME" ? "text-green-600" : "text-red-600"}>
                        {entry.type === "EXPENSE" ? "−" : "+"}
                        {formatMoney(entry.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.duesPaymentId && (
                          <a
                            href={`/${locale}/members/dues`}
                            className="inline-flex items-center text-xs text-navy hover:underline"
                          >
                            <Link2 className="h-3 w-3 mr-0.5" />
                            {entry.duesMemberName ?? t("dues")}
                          </a>
                        )}
                        {entry.actionId && (
                          <a
                            href={`/${locale}/actions`}
                            className="inline-flex items-center text-xs text-navy hover:underline"
                          >
                            <Link2 className="h-3 w-3 mr-0.5" />
                            {entry.actionTitle ?? t("action")}
                          </a>
                        )}
                        {entry.eventTitle && (
                          <span className="text-xs text-gray-400">{entry.eventTitle}</span>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-red-500"
                          disabled={pending || !!entry.duesPaymentId}
                          onClick={() => run(() => deleteEntry(entry.id), t("entryDeleted"))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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