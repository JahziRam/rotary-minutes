"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link2, Upload } from "lucide-react";
import {
  autoMatchBankLinesAction,
  importBankStatement,
} from "@/actions/treasury-reconciliation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { validateUploadFileSize } from "@/lib/upload-limits";

export function BankReconciliationPanel({ canManage }: { canManage: boolean }) {
  const t = useTranslations("treasury.reconciliation");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  if (!canManage) return null;

  function importCsv(text: string) {
    startTransition(async () => {
      const result = await importBankStatement(text);
      if ("success" in result && result.success) {
        setToast(t("importSuccess", { count: result.imported }));
        setCsv("");
        router.refresh();
      } else if ("error" in result) {
        setToast(t(`importError.${result.error}`));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleFile(file: File) {
    const sizeError = validateUploadFileSize(file.size);
    if (sizeError === "TOO_LARGE") {
      setToast(t("importError.TOO_LARGE"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    file.text().then(importCsv);
  }

  function handleAutoMatch() {
    startTransition(async () => {
      const result = await autoMatchBankLinesAction();
      if ("success" in result && result.success) {
        setToast(t("matchSuccess", { matched: result.matched, total: result.total }));
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">{t("hint")}</p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={t("pastePlaceholder")}
          rows={4}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {t("uploadFile")}
          </Button>
          <Button
            size="sm"
            variant="gold"
            disabled={pending || !csv.trim()}
            onClick={() => importCsv(csv)}
          >
            {t("import")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={handleAutoMatch}>
            <Link2 className="h-4 w-4 mr-1" />
            {t("autoMatch")}
          </Button>
        </div>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}