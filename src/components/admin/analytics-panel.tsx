import { getTranslations } from "next-intl/server";
import { BarChart3, Users, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { ProductAnalytics } from "@/lib/queries/analytics";

const actionLabels: Record<string, string> = {
  MINUTE_FINALIZED: "PV finalisés",
  MINUTE_ARCHIVED: "PV archivés",
  MINUTE_DUPLICATED: "PV dupliqués",
  MINUTE_EMAILED: "PV envoyés",
  EMAIL_COMPOSED: "Emails composés",
  EMAIL_SCHEDULED: "Emails programmés",
  CLUB_REGISTERED: "Inscriptions",
  SUBSCRIPTION_PLAN_CHOSEN: "Plans choisis",
  MEETING_CREATED: "Réunions créées",
  MEMBER_CREATED: "Membres ajoutés",
};

export async function AnalyticsPanel({
  analytics,
  locale,
}: {
  analytics: ProductAnalytics;
  locale: string;
}) {
  const t = await getTranslations("admin.analytics");
  const dateLocale = locale === "fr" ? fr : enUS;
  const maxUsage = Math.max(...analytics.featureUsage.map((f) => f.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-navy" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1">
              <Users className="h-3.5 w-3.5" />
              {t("dau")}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.dauEstimate}</p>
            <p className="text-xs text-gray-500 mt-1">{t("dauHint")}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1">
              <Users className="h-3.5 w-3.5" />
              {t("wau")}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.wauEstimate}</p>
            <p className="text-xs text-gray-500 mt-1">{t("wauHint")}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("sessions")}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.activeSessionsToday}</p>
            <p className="text-xs text-gray-500 mt-1">{t("sessionsHint")}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t("featureUsage")}</h4>
          {analytics.featureUsage.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noUsage")}</p>
          ) : (
            <ul className="space-y-2">
              {analytics.featureUsage.map((item) => (
                <li key={item.action} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-700">
                      {actionLabels[item.action] ?? item.action}
                    </span>
                    <span className="text-gray-500 font-medium">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy rounded-full"
                      style={{ width: `${(item.count / maxUsage) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-600" />
            {t("churnRisk")}
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="warning">
              {t("expiring", { count: analytics.churnRisk.expiringTrials })}
            </Badge>
            <Badge variant="danger">
              {t("expired", { count: analytics.churnRisk.expiredTrials })}
            </Badge>
            <Badge variant="muted">
              {t("pastDue", { count: analytics.churnRisk.pastDue })}
            </Badge>
          </div>
          {analytics.churnRisk.atRiskClubs.length > 0 && (
            <ul className="space-y-2">
              {analytics.churnRisk.atRiskClubs.map((club) => (
                <li
                  key={club.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-900 truncate">{club.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="warning" className="text-[10px]">
                      {club.status}
                    </Badge>
                    {club.trialEndsAt && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(club.trialEndsAt), "d MMM", { locale: dateLocale })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}