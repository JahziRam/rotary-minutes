"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Clock } from "lucide-react";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";

type Log = {
  id: string;
  recipient: string;
  status: string;
  error: string | null;
  openedAt: Date | null;
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
  pending: "muted",
};

function readBadgeVariant(
  status: string,
  openedAt: Date | null
): "success" | "warning" | "muted" {
  if (status !== "sent") return "muted";
  return openedAt ? "success" : "warning";
}

export function HistoryList({ logs, locale }: { logs: Log[]; locale: string }) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");

  const filterFn = useCallback(
    (log: Log, q: string) =>
      matchesAny([log.recipient, log.campaign.name, log.campaign.subject, log.status], q),
    []
  );

  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    logs,
    filterFn,
    15
  );

  const fmt = (d: Date) =>
    new Date(d).toLocaleString(
      locale === "en" ? "en-GB" : locale === "es" ? "es-ES" : "fr-FR"
    );

  return (
    <div className="space-y-4">
      <ListToolbar query={query} onQueryChange={setQuery} />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">{tCommon("noResults")}</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {pageSlice.items.map((log) => {
            const readKey =
              log.status !== "sent"
                ? "notApplicable"
                : log.openedAt
                  ? "read"
                  : "unread";

            return (
              <div key={log.id} className="p-4 bg-white hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.recipient}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {log.campaign.name} — {log.campaign.subject}
                    </p>
                    {log.error && (
                      <p className="text-xs text-red-600 mt-1">{log.error}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <Badge variant={STATUS_VARIANT[log.status] ?? "muted"}>
                      {t(`logStatus.${log.status}` as "sent")}
                    </Badge>
                    <div className="flex items-center justify-end gap-1">
                      {readKey === "read" && (
                        <Eye className="h-3 w-3 text-emerald-600" />
                      )}
                      {readKey === "unread" && (
                        <EyeOff className="h-3 w-3 text-amber-500" />
                      )}
                      {readKey === "notApplicable" && (
                        <Clock className="h-3 w-3 text-gray-300" />
                      )}
                      <Badge
                        variant={readBadgeVariant(log.status, log.openedAt)}
                        className="text-[10px]"
                      >
                        {t(`readStatus.${readKey}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{fmt(log.createdAt)}</p>
                    {log.openedAt && (
                      <p className="text-xs text-emerald-600">
                        {t("openedAt")} {fmt(log.openedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ListPagination
        page={page}
        totalPages={pageSlice.totalPages}
        total={pageSlice.total}
        start={pageSlice.start}
        end={pageSlice.end}
        onPageChange={setPage}
      />
    </div>
  );
}
