"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Upload } from "lucide-react";
import { importMembersFromCsv } from "@/actions/member-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { validateUploadFileSize } from "@/lib/upload-limits";

export function MemberImportPanel({ canManage }: { canManage: boolean }) {
  const t = useTranslations("members.import");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  if (!canManage) return null;

  function importCsv(text: string) {
    startTransition(async () => {
      const result = await importMembersFromCsv(text);
      if ("success" in result && result.success) {
        let msg = t("success", { count: result.imported });
        if (result.skipped > 0) {
          msg += t("skipped", { count: result.skipped });
        }
        if (result.errors.length > 0) {
          msg += ` (${result.errors.length} ${t("errors")})`;
        }
        setToast(msg);
        setCsv("");
        router.refresh();
      } else if ("error" in result) {
        setToast(t(`error.${result.error}`));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleFile(file: File) {
    const sizeError = validateUploadFileSize(file.size);
    if (sizeError === "TOO_LARGE") {
      setToast(t("error.TOO_LARGE"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    file.text().then(importCsv);
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
          <a href="/templates/members-import-template.csv" download>
            <Button size="sm" variant="outline" type="button">
              <Download className="h-4 w-4 mr-1" />
              {t("downloadTemplate")}
            </Button>
          </a>
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
        </div>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}