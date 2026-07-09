"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Download, FileText, Plus, Trash2, Link2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { createEntry, deleteEntry, updateEntry } from "@/actions/treasury";
import { TreasuryExtras } from "@/components/treasury/treasury-extras";
import { TreasuryImportPanel } from "@/components/treasury/treasury-import-panel";
import type { getTreasuryDashboardData } from "@/lib/queries/treasury";
import type { BudgetEntryType, TreasuryCollectionStatus } from "@/generated/prisma/client";

type DashboardData = Awaited<ReturnType<typeof getTreasuryDashboardData>>;

type EntryRow = {
  id: string;
  type: BudgetEntryType;
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  duesPaymentId: string | null;
  duesMemberName: string | null;
  actionId: string | null;
  actionTitle: string | null;
  reference: string | null;
  collectionStatus?: TreasuryCollectionStatus;
  eventRegistrationId?: string | null;
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
  fiscalYear,
  dashboard,
  allCategories = [],
  treasuryImportEnabled = false,
}: {
  entries: EntryRow[];
  categories: Category[];
  events: EventOption[];
  summary: { income: number; expense: number; balance: number };
  currency: string;
  canManage: boolean;
  locale: string;
  initialEventId?: string;
  fiscalYear: number;
  dashboard: DashboardData;
  allCategories?: Array<{
    id: string;
    name: string;
    type: BudgetEntryType;
    isActive: boolean;
  }>;
  treasuryImportEnabled?: boolean;
}) {
  const t = useTranslations("treasury");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState(initialEventId ?? "");
  const [typeFilter, setTypeFilter] = useState<"" | BudgetEntryType>("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "EXPENSE" as BudgetEntryType,
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    categoryId: "",
    eventId: "",
    collectionStatus: "COLLECTED" as TreasuryCollectionStatus,
  });
  const [editForm, setEditForm] = useState({
    type: "EXPENSE" as BudgetEntryType,
    amount: "",
    date: "",
    description: "",
    categoryId: "",
    eventId: "",
    collectionStatus: "COLLECTED" as TreasuryCollectionStatus,
  });
  const dateLocale = locale === "fr" ? fr : enUS;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (eventFilter && e.eventId !== eventFilter) return false;
      if (typeFilter && e.type !== typeFilter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        (e.categoryName ?? "").toLowerCase().includes(q) ||
        (e.reference ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, eventFilter, typeFilter, search]);

  const maxMonthly = useMemo(
    () =>
      Math.max(
        1,
        ...dashboard.monthlyBreakdown.map((m) => Math.max(m.income, m.expense))
      ),
    [dashboard.monthlyBreakdown]
  );

  function formatMoney(amount: number) {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function run<T extends { success?: boolean; error?: string }>(
    action: () => Promise<T>,
    okMsg: string,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(okMsg);
        onSuccess?.();
        router.refresh();
      }
    });
  }

  function changeFiscalYear(year: string) {
    const params = new URLSearchParams();
    params.set("year", year);
    if (eventFilter) params.set("eventId", eventFilter);
    if (typeFilter) params.set("type", typeFilter);
    router.push(`/${locale}/treasury?${params.toString()}`);
  }

  function startEdit(entry: EntryRow) {
    setEditingId(entry.id);
    setEditForm({
      type: entry.type,
      amount: String(entry.amount),
      date: entry.date.slice(0, 10),
      description: entry.description,
      categoryId: entry.categoryId ?? "",
      eventId: entry.eventId ?? "",
      collectionStatus: entry.collectionStatus ?? "COLLECTED",
    });
  }

  const queryParams = new URLSearchParams();
  queryParams.set("from", dashboard.exportFrom);
  queryParams.set("to", dashboard.exportTo);
  if (eventFilter) queryParams.set("eventId", eventFilter);
  if (typeFilter) queryParams.set("type", typeFilter);
  const qs = queryParams.toString();

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-500">{t("fiscalYear")}</label>
          <select
            value={fiscalYear}
            onChange={(e) => changeFiscalYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            {dashboard.fiscalYearOptions.map((y) => (
              <option key={y} value={y}>
                {dashboard.fiscalYearLabel && y === fiscalYear
                  ? dashboard.fiscalYearLabel
                  : `${y}-${y + 1}`}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400">
            {t("entryCount", { count: dashboard.entryCount })}
          </span>
        </div>

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

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("monthlyChart")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
                {dashboard.monthlyBreakdown.map((m) => (
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
            <CardContent className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {[...dashboard.incomeByCategory, ...dashboard.expensesByCategory].length === 0 ? (
                <p className="text-gray-500">{t("noEntries")}</p>
              ) : (
                [...dashboard.incomeByCategory, ...dashboard.expensesByCategory].map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span className="text-gray-700">{c.label}</span>
                    <span className="font-medium">{formatMoney(c.total)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder={t("searchTransactions")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 bg-white"
              />
            </div>
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
            {form.type === "INCOME" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.collectionStatus === "RECEIVABLE"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      collectionStatus: e.target.checked ? "RECEIVABLE" : "COLLECTED",
                    })
                  }
                  className="rounded"
                />
                {t("receivable")}
              </label>
            )}
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
                      collectionStatus: form.type === "INCOME" ? form.collectionStatus : undefined,
                    }),
                  t("entryCreated"),
                  () => setShowForm(false)
                )
              }
            >
              {t("saveEntry")}
            </Button>
          </Card>
        )}

        {editingId && canManage && (
          <Card className="p-4 space-y-3 border-navy/20">
            <p className="text-sm font-medium text-navy">{t("editTransaction")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm({ ...editForm, type: e.target.value as BudgetEntryType })
                }
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="INCOME">{t("types.INCOME")}</option>
                <option value="EXPENSE">{t("types.EXPENSE")}</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder={t("amount")}
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <select
                value={editForm.categoryId}
                onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">{t("noCategory")}</option>
                {categories
                  .filter((c) => c.type === editForm.type)
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
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
            <select
              value={editForm.eventId}
              onChange={(e) => setEditForm({ ...editForm, eventId: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="">{t("noEvent")}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            {editForm.type === "INCOME" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.collectionStatus === "RECEIVABLE"}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      collectionStatus: e.target.checked ? "RECEIVABLE" : "COLLECTED",
                    })
                  }
                  className="rounded"
                />
                {t("receivable")}
              </label>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="gold"
                disabled={pending || !editForm.amount || !editForm.description}
                onClick={() =>
                  run(
                    () =>
                      updateEntry(editingId, {
                        type: editForm.type,
                        amount: parseFloat(editForm.amount),
                        date: editForm.date,
                        description: editForm.description,
                        categoryId: editForm.categoryId || null,
                        eventId: editForm.eventId || null,
                        collectionStatus:
                          editForm.type === "INCOME" ? editForm.collectionStatus : undefined,
                      }),
                    t("entryUpdated"),
                    () => setEditingId(null)
                  )
                }
              >
                {t("saveEdit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                {t("cancelEdit")}
              </Button>
            </div>
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
                      {entry.collectionStatus === "RECEIVABLE" && (
                        <Badge variant="warning" className="mt-1">
                          {t("receivableBadge")}
                        </Badge>
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
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            disabled={pending || !!entry.duesPaymentId}
                            onClick={() => startEdit(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-500"
                            disabled={pending || !!entry.duesPaymentId}
                            onClick={() => run(() => deleteEntry(entry.id), t("entryDeleted"))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {treasuryImportEnabled && <TreasuryImportPanel canManage={canManage} />}
          <TreasuryExtras
            allCategories={allCategories}
            canManage={canManage}
            locale={locale}
            exportFrom={dashboard.exportFrom}
            exportTo={dashboard.exportTo}
          />
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}