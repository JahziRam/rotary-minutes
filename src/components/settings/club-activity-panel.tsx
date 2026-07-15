"use client";

import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actorName: string | null;
};

export function ClubActivityPanel({ logs }: { logs: ActivityRow[] }) {
  const t = useTranslations("clubActivity");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-navy" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">{t("description")}</p>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {t.has(`actions.${log.action}`)
                      ? t(`actions.${log.action}`)
                      : log.action}
                  </p>
                  <time className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
                {log.actorName && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("by", { name: log.actorName })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}