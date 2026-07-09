"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { importTreasuryCsv } from "@/actions/treasury-import";
import { validateUploadFileSize } from "@/lib/upload-limits";

async function xlsxToCsv(file: File): Promise<string> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(sheet);
}

export function TreasuryImportPanel({ canManage }: { canManage: boolean }) {
  const t = useTranslations("treasury");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  if (!canManage) return null;

  function handleFile(file: File) {
    const sizeError = validateUploadFileSize(file.size);
    if (sizeError === "TOO_LARGE") {
      setToast(t("importError.TOO_LARGE"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    startTransition(async () => {
      try {
        let csv = "";
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          csv = await xlsxToCsv(file);
        } else {
          csv = await file.text();
        }
        const result = await importTreasuryCsv(csv);
        if ("success" in result && result.success) {
          const errMsg =
            result.errors.length > 0
              ? ` (${result.errors.length} ${t("importErrors")})`
              : "";
          setToast(`${t("importSuccess", { count: result.imported })}${errMsg}`);
          router.refresh();
        } else if ("error" in result) {
          setToast(t(`importError.${result.error}`));
        }
      } catch {
        setToast(t("importError.GENERIC"));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("importTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">{t("importHint")}</p>
        <div className="flex flex-wrap gap-2">
          <a href="/templates/treasury-import-template.csv" download>
            <Button size="sm" variant="outline" type="button">
              <Download className="h-4 w-4 mr-1" />
              {t("downloadTemplate")}
            </Button>
          </a>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            size="sm"
            variant="gold"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {t("importFile")}
          </Button>
        </div>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}