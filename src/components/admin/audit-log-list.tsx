import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

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
};

const actionVariant: Record<string, "default" | "success" | "warning" | "danger" | "muted"> = {
  CLUB_DEACTIVATED: "danger",
  CLUB_ACTIVATED: "success",
  SUBSCRIPTION_UPDATED: "warning",
  TRIAL_EXTENDED: "warning",
  MINUTE_FINALIZED: "success",
  MINUTE_ARCHIVED: "muted",
};

export function AuditLogList({ logs, locale }: { logs: AuditEntry[]; locale: string }) {
  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-navy" />
          Journal d&apos;audit
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune activité enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Action</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 hidden sm:table-cell">Club</th>
                  <th className="text-left py-2 font-medium text-gray-500 hidden md:table-cell">Utilisateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: dateLocale })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={actionVariant[log.action] ?? "default"}>
                        {actionLabels[log.action] ?? log.action}
                      </Badge>
                      <span className="text-xs text-gray-400 ml-1.5 hidden lg:inline">{log.entity}</span>
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
      </CardContent>
    </Card>
  );
}