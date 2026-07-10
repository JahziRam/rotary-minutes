"use client";

import { useCallback } from "react";
import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  createdAt: Date | string;
  club: { name: string } | null;
  user: { firstName: string; lastName: string; email: string } | null;
}

const actionLabels: Record<string, string> = {
  CLUB_REGISTERED: "Inscription club",
  CLUB_ACTIVATED: "Club activé",
  CLUB_DEACTIVATED: "Club désactivé",
  CLUB_SETTINGS_UPDATED: "Paramètres modifiés",
  SUBSCRIPTION_UPDATED: "Abonnement modifié",
  TRIAL_EXTENDED: "Essai prolongé",
  MINUTE_FINALIZED: "PV finalisé",
  MINUTE_ARCHIVED: "PV archivé",
  MINUTE_DUPLICATED: "PV dupliqué",
  MINUTE_EMAILED: "PV envoyé",
  MINUTE_SUBMITTED_REVIEW: "PV soumis en révision",
  MEETING_CREATED: "Réunion créée",
  MEETING_INVITATION_SENT: "Convocation envoyée",
  MEETING_LIVE_STARTED: "Réunion live démarrée",
  MEETING_LIVE_ENDED: "Réunion live terminée",
};

const actionVariant: Record<string, "default" | "success" | "warning" | "danger" | "muted"> = {
  CLUB_DEACTIVATED: "danger",
  CLUB_ACTIVATED: "success",
  SUBSCRIPTION_UPDATED: "warning",
  TRIAL_EXTENDED: "warning",
  MINUTE_FINALIZED: "success",
  MINUTE_ARCHIVED: "muted",
  MEETING_LIVE_STARTED: "success",
  MEETING_LIVE_ENDED: "muted",
};

export function AuditLogList({ logs, locale }: { logs: AuditEntry[]; locale: string }) {
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;

  const filterFn = useCallback((log: AuditEntry, q: string) => {
    const userName = log.user
      ? `${log.user.firstName} ${log.user.lastName} ${log.user.email}`
      : "";
    const actionLabel = actionLabels[log.action] ?? log.action;
    return matchesAny(
      [log.action, actionLabel, log.entity, log.club?.name, userName],
      q
    );
  }, []);

  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    logs,
    filterFn,
    15
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-navy" />
          {locale === "fr"
            ? "Journal d'audit"
            : locale === "es"
              ? "Registro de auditoría"
              : "Audit log"}
        </CardTitle>
        {logs.length > 0 && (
          <ListToolbar query={query} onQueryChange={setQuery} />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">
            {locale === "fr"
              ? "Aucune activité enregistrée."
              : locale === "es"
                ? "Sin actividad registrada."
                : "No activity recorded."}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">
            {locale === "fr"
              ? "Aucun résultat."
              : locale === "es"
                ? "Sin resultados."
                : "No results."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">
                    {locale === "fr" ? "Date" : locale === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">
                    Action
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 hidden sm:table-cell">
                    Club
                  </th>
                  <th className="text-left py-2 font-medium text-gray-500 hidden md:table-cell">
                    {locale === "fr"
                      ? "Utilisateur"
                      : locale === "es"
                        ? "Usuario"
                        : "User"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageSlice.items.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "d MMM yyyy HH:mm", {
                        locale: dateLocale,
                      })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={actionVariant[log.action] ?? "default"}>
                        {actionLabels[log.action] ?? log.action}
                      </Badge>
                      <span className="text-xs text-gray-400 ml-1.5 hidden lg:inline">
                        {log.entity}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700 hidden sm:table-cell">
                      {log.club?.name ?? "—"}
                    </td>
                    <td className="py-2.5 text-gray-600 hidden md:table-cell">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      </CardContent>
    </Card>
  );
}
