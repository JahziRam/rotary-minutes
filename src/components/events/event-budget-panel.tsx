"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Download, Paperclip, Trash2, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { createEventBudgetEntry, updateEvent } from "@/actions/events";
import { deleteBudgetDocument } from "@/actions/budget-documents";
import type { BudgetDocumentKind } from "@/generated/prisma/client";

type BudgetSummary = {
  planned: number | null;
  income: number;
  expense: number;
  actual: number;
  variance: number | null;
};

type BudgetEntryRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  currency: string;
  date: string;
  description: string;
};

type BudgetDocRow = {
  id: string;
  kind: BudgetDocumentKind;
  label: string | null;
  fileName: string;
  mimeType: string;
  amount: number | null;
  notes: string | null;
  createdAt: string;
  viewUrl: string;
  downloadUrl: string;
};

const DOC_KINDS: BudgetDocumentKind[] = [
  "QUOTE",
  "PROFORMA",
  "PURCHASE_ORDER",
  "CONTRACT",
  "ESTIMATE",
  "INVOICE",
  "OTHER",
];

export function EventBudgetPanel({
  eventId,
  currency,
  locale,
  canManage,
  budget,
  budgetNotes,
  entries,
  documents,
}: {
  eventId: string;
  currency: string;
  locale: string;
  canManage: boolean;
  budget: BudgetSummary;
  budgetNotes: string | null;
  entries: BudgetEntryRow[];
  documents: BudgetDocRow[];
}) {
  const t = useTranslations("projects.budget");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dateLocale = locale === "fr" ? fr : enUS;

  const [plannedInput, setPlannedInput] = useState(
    budget.planned != null ? String(budget.planned) : ""
  );
  const [notesInput, setNotesInput] = useState(budgetNotes ?? "");
  const [entryForm, setEntryForm] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [docForm, setDocForm] = useState({
    kind: "QUOTE" as BudgetDocumentKind,
    label: "",
    amount: "",
    notes: "",
  });

  const fmt = (n: number) => formatBudgetMoney(n, currency, locale);

  function saveBudget() {
    startTransition(async () => {
      const planned =
        plannedInput.trim() === "" ? null : Number(plannedInput.replace(",", "."));
      const result = await updateEvent(eventId, {
        budgetPlanned: planned,
        budgetNotes: notesInput,
      });
      if ("success" in result && result.success) {
        setToast(t("budgetSaved"));
        router.refresh();
      }
    });
  }

  function addEntry() {
    const amount = Number(entryForm.amount.replace(",", "."));
    if (!entryForm.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    startTransition(async () => {
      const result = await createEventBudgetEntry(eventId, {
        type: entryForm.type,
        amount,
        date: entryForm.date,
        description: entryForm.description,
      });
      if ("success" in result && result.success) {
        setToast(t("entryCreated"));
        setEntryForm((f) => ({ ...f, amount: "", description: "" }));
        router.refresh();
      }
    });
  }

  function uploadDocs(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    fd.set("scopeType", "event");
    fd.set("scopeId", eventId);
    fd.set("kind", docForm.kind);
    if (docForm.label.trim()) fd.set("label", docForm.label.trim());
    if (docForm.notes.trim()) fd.set("notes", docForm.notes.trim());
    if (docForm.amount.trim()) fd.set("amount", docForm.amount.trim());
    for (const file of Array.from(files)) fd.append("files", file);
    startTransition(async () => {
      const res = await fetch("/api/budget/documents/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { success?: boolean };
      if (res.ok && json.success) {
        setToast(t("documentUploaded"));
        setDocForm((f) => ({ ...f, label: "", amount: "", notes: "" }));
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else setToast(t("uploadError"));
    });
  }

  function removeDoc(id: string) {
    startTransition(async () => {
      const result = await deleteBudgetDocument(id);
      if ("success" in result && result.success) {
        setToast(t("documentDeleted"));
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-navy" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-navy/5 px-3 py-2">
            <p className="text-xs text-gray-500">{t("planned")}</p>
            <p className="font-semibold text-navy">
              {budget.planned != null ? fmt(budget.planned) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 px-3 py-2">
            <p className="text-xs text-gray-500">{t("income")}</p>
            <p className="font-semibold text-green-800">{fmt(budget.income)}</p>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-2">
            <p className="text-xs text-gray-500">{t("expense")}</p>
            <p className="font-semibold text-red-800">{fmt(budget.expense)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{t("variance")}</p>
            <p
              className={`font-semibold ${
                budget.variance != null && budget.variance >= 0
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {budget.variance != null ? fmt(budget.variance) : "—"}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("planned")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm bg-white"
                value={plannedInput}
                onChange={(e) => setPlannedInput(e.target.value)}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">{t("notes")}</span>
              <textarea
                className="flex min-h-16 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />
            </label>
            <div>
              <Button size="sm" onClick={saveBudget} disabled={pending}>
                {t("saveBudget")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{t("entriesTitle")}</h3>
          {canManage && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 rounded-xl border border-gray-100">
              <select
                className="h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={entryForm.type}
                onChange={(e) =>
                  setEntryForm((f) => ({
                    ...f,
                    type: e.target.value as "INCOME" | "EXPENSE",
                  }))
                }
              >
                <option value="EXPENSE">{t("expense")}</option>
                <option value="INCOME">{t("income")}</option>
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder={t("amount")}
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                value={entryForm.amount}
                onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <input
                type="date"
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                value={entryForm.date}
                onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))}
              />
              <input
                type="text"
                placeholder={t("description")}
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm sm:col-span-2 lg:col-span-3"
                value={entryForm.description}
                onChange={(e) =>
                  setEntryForm((f) => ({ ...f, description: e.target.value }))
                }
              />
              <Button size="sm" onClick={addEntry} disabled={pending}>
                {t("addEntry")}
              </Button>
            </div>
          )}
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noEntries")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {entries.map((e) => (
                <li key={e.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{e.description}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(e.date), "d MMM yyyy", { locale: dateLocale })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={e.type === "INCOME" ? "success" : "danger"}>
                      {e.type === "INCOME" ? t("income") : t("expense")}
                    </Badge>
                    <p
                      className={`font-medium ${
                        e.type === "INCOME" ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {e.type === "INCOME" ? "+" : "−"}
                      {fmt(e.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            {t("documentsTitle")}
          </h3>
          {canManage && (
            <div className="grid sm:grid-cols-2 gap-2 p-3 rounded-xl border border-dashed border-gray-200">
              <select
                className="h-10 rounded-lg border border-gray-200 px-2 text-sm"
                value={docForm.kind}
                onChange={(e) =>
                  setDocForm((f) => ({
                    ...f,
                    kind: e.target.value as BudgetDocumentKind,
                  }))
                }
              >
                {DOC_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`kinds.${k}`)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t("docLabel")}
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                value={docForm.label}
                onChange={(e) => setDocForm((f) => ({ ...f, label: e.target.value }))}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder={t("docAmount")}
                className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                value={docForm.amount}
                onChange={(e) => setDocForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                  className="text-sm"
                  onChange={(e) => uploadDocs(e.target.files)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t("upload")}
                </Button>
              </div>
            </div>
          )}
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noDocuments")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="py-2 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {d.label || d.fileName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t(`kinds.${d.kind}`)}
                      {d.amount != null ? ` · ${fmt(d.amount)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={d.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-lg border border-gray-200 px-2 text-xs hover:bg-gray-50"
                    >
                      {t("view")}
                    </a>
                    <a
                      href={d.downloadUrl}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => removeDoc(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}
