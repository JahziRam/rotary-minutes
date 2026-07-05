import { getTranslations } from "next-intl/server";
import {
  Database,
  Mail,
  AlertTriangle,
  Server,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HealthCheckResult } from "@/lib/queries/health";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant={ok ? "success" : "danger"}>{label}</Badge>
  );
}

export async function HealthDashboard({ health }: { health: HealthCheckResult }) {
  const t = await getTranslations("admin.health");

  const checks = [
    {
      icon: Database,
      title: t("database"),
      ok: health.database.ok,
      detail: health.database.ok
        ? t("latency", { ms: health.database.latencyMs ?? 0 })
        : health.database.error ?? t("error"),
    },
    {
      icon: Mail,
      title: t("resend"),
      ok: health.resendConfigured,
      detail: health.resendConfigured ? t("configured") : t("notConfigured"),
    },
    {
      icon: Server,
      title: t("email"),
      ok: health.emailEnabled,
      detail: health.emailEnabled ? t("enabled") : t("disabled"),
    },
    {
      icon: AlertTriangle,
      title: t("trialsExpiring"),
      ok: health.trialsExpiringCount === 0,
      detail: t("count", { count: health.trialsExpiringCount }),
    },
    {
      icon: CreditCard,
      title: t("stripe"),
      ok: health.stripeConfigured && health.stripeEnabled,
      detail: !health.stripeConfigured
        ? t("stripeKeysMissing")
        : health.stripeEnabled
          ? t("enabled")
          : t("disabled"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {checks.map(({ icon: Icon, title, ok, detail }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <Icon className={`h-5 w-5 shrink-0 ${ok ? "text-green-600" : "text-amber-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <StatusBadge
                    ok={ok}
                    label={ok ? t("statusOk") : t("statusWarn")}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          {t("envStatus", {
            requiredOk: health.envChecks.requiredOk,
            requiredTotal: health.envChecks.requiredTotal,
            recommendedOk: health.envChecks.recommendedOk,
            recommendedTotal: health.envChecks.recommendedTotal,
          })}
        </p>
        {health.maintenanceMode && (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("maintenance")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}