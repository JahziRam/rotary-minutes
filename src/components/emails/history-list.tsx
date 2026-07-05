"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type Log = {
  id: string;
  recipient: string;
  status: string;
  error: string | null;
  createdAt: Date;
  campaign: {
    name: string;
    subject: string;
    sentAt: Date | null;
    status: string;
  };
};

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "muted"> = {
  sent: "success",
  failed: "danger",
  simulated: "warning",
  skipped: "muted",
};

export function HistoryList({ logs, locale }: { logs: Log[]; locale: string }) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");

  const fmt = (d: Date) =>
    new Date(d).toLocaleString(locale === "en" ? "en-GB" : "fr-FR");

  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{tCommon("noResults")}</p>;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
      {logs.map((log) => (
        <div key={log.id} className="p-4 bg-white hover:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{log.recipient}</p>
              <p className="text-xs text-gray-500 truncate">{log.campaign.name} — {log.campaign.subject}</p>
              {log.error && <p className="text-xs text-red-600 mt-1">{log.error}</p>}
            </div>
            <div className="text-right shrink-0">
              <Badge variant={STATUS_VARIANT[log.status] ?? "muted"}>
                {t(`logStatus.${log.status}`)}
              </Badge>
              <p className="text-xs text-gray-400 mt-1">{fmt(log.createdAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}