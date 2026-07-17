"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { deleteBudgetDocument } from "@/actions/budget-documents";
import type { BudgetDocumentKind } from "@/generated/prisma/client";

type DocRow = {
  id: string;
  kind: BudgetDocumentKind | string;
  label: string | null;
  fileName: string;
  mimeType: string;
  amount: number | null;
  createdAt: string;
  viewUrl: string;
  downloadUrl: string;
};

const KINDS: BudgetDocumentKind[] = [
  "QUOTE",
  "PROFORMA",
  "PURCHASE_ORDER",
  "CONTRACT",
  "ESTIMATE",
  "INVOICE",
  "OTHER",
];

export function MandateDocumentsPanel({
  mandateYear,
  locale,
  currency,
  documents,
}: {
  mandateYear: number;
  locale: string;
  currency: string;
  documents: DocRow[];
}) {
  const t = useTranslations("projects.budget");
  const tPlan = useTranslations("mandatePlan");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<BudgetDocumentKind>("OTHER");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const fmt = (n: number) => formatBudgetMoney(n, currency, locale);

  function upload(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    fd.set("scopeType", "mandate");
    fd.set("mandateYear", String(mandateYear));
    fd.set("kind", kind);
    if (label.trim()) fd.set("label", label.trim());
    if (amount.trim()) fd.set("amount", amount.trim());
    for (const f of Array.from(files)) fd.append("files", f);
    startTransition(async () => {
      const res = await fetch("/api/budget/documents/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { success?: boolean };
      if (res.ok && json.success) {
        setToast(t("documentUploaded"));
        setLabel("");
        setAmount("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else setToast(t("uploadError"));
    });
  }

  function remove(id: string) {
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
          <Paperclip className="h-4 w-4" />
          {tPlan("mandateDocuments")} ({mandateYear}-{mandateYear + 1})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-2 p-3 rounded-xl border border-dashed border-gray-200">
          <select
            className="h-10 rounded-lg border border-gray-200 px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as BudgetDocumentKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            placeholder={t("docLabel")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            placeholder={t("docAmount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="text-sm"
              onChange={(e) => upload(e.target.files)}
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

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noDocuments")}</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {documents.map((d) => (
              <li
                key={d.id}
                className="py-2 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">{d.label || d.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {t(`kinds.${d.kind as BudgetDocumentKind}`)}
                    {d.amount != null ? ` · ${fmt(d.amount)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <a
                    href={d.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-lg border px-2 text-xs"
                  >
                    {t("view")}
                  </a>
                  <a
                    href={d.downloadUrl}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => remove(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}
