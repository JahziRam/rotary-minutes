"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestDataExport, requestAccountDeletion } from "@/actions/gdpr";
import type { DataRequestStatus } from "@/generated/prisma/client";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

interface ExportRequest {
  id: string;
  status: DataRequestStatus;
  createdAt: Date | string;
  completedAt: Date | string | null;
}

interface DeletionRequest {
  id: string;
  status: DataRequestStatus;
  createdAt: Date | string;
  reason: string | null;
}

export function PrivacyPanel({
  exports,
  deletions,
}: {
  exports: ExportRequest[];
  deletions: DeletionRequest[];
}) {
  const t = useTranslations("gdpr");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  function handleExport() {
    startTransition(async () => {
      setMessage(null);
      const result = await requestDataExport();
      if ("error" in result && result.error) {
        setMessage(t(`errors.${result.error}`));
        return;
      }
      if ("data" in result && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rotary-minutes-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage(t("exportSuccess"));
      }
    });
  }

  function handleDeletion() {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      setMessage(null);
      const result = await requestAccountDeletion(deletionReason);
      if ("error" in result && result.error) {
        setMessage(t(`errors.${result.error}`));
        return;
      }
      setMessage(t("deleteSuccess"));
      setDeletionReason("");
    });
  }

  const latestExport = exports[0];
  const latestDeletion = deletions[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-navy/5 border border-navy/10">
        <Shield className="h-5 w-5 text-navy shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600">{t("description")}</p>
      </div>

      {message && (
        <p className="text-sm text-navy bg-gold/10 rounded-lg px-3 py-2 border border-gold/20">
          {message}
        </p>
      )}

      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">{t("exportTitle")}</h3>
        <p className="text-sm text-gray-500">{t("exportDescription")}</p>
        {latestExport && (
          <p className="text-xs text-gray-400">
            {t("lastRequest")}: {format(new Date(latestExport.createdAt), "d MMM yyyy HH:mm", { locale: dateLocale })}
            {" — "}
            {t(`status.${latestExport.status}`)}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
          <Download className="h-4 w-4" />
          {pending ? t("processing") : t("exportButton")}
        </Button>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        <h3 className="font-medium text-gray-900">{t("deleteTitle")}</h3>
        <p className="text-sm text-gray-500">{t("deleteDescription")}</p>
        {latestDeletion && (
          <p className="text-xs text-gray-400">
            {t("lastRequest")}: {format(new Date(latestDeletion.createdAt), "d MMM yyyy", { locale: dateLocale })}
            {" — "}
            {t(`status.${latestDeletion.status}`)}
          </p>
        )}
        <textarea
          value={deletionReason}
          onChange={(e) => setDeletionReason(e.target.value)}
          placeholder={t("deleteReasonPlaceholder")}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
        <Button variant="outline" size="sm" onClick={handleDeletion} disabled={pending} className="text-red-700 border-red-200 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
          {t("deleteButton")}
        </Button>
      </div>
    </div>
  );
}