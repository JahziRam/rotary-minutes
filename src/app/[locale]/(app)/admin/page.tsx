import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import Link from "next/link";
import {
  getAdminStats,
  getExpiringTrials,
  getSubscriptionBreakdown,
  getAdminAuditLogs,
} from "@/lib/queries/admin";
import { getHealthChecks } from "@/lib/queries/health";
import { getProductAnalytics } from "@/lib/queries/analytics";
import { HealthDashboard } from "@/components/admin/health-dashboard";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TrialAlerts } from "@/components/admin/trial-alerts";
import { SubscriptionBreakdown } from "@/components/admin/subscription-breakdown";
import { AuditLogList } from "@/components/admin/audit-log-list";
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  Calendar,
  UserCheck,
  Clock,
} from "lucide-react";

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const session = await getSession();

  if (!session?.user?.isSuperAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  const [stats, expiringTrials, subscriptionBreakdown, auditLogs, health, analytics] =
    await Promise.all([
      getAdminStats().catch((e) => {
        console.error("[admin] getAdminStats:", e);
        return {
          clubsActive: 0,
          clubsInactive: 0,
          usersCount: 0,
          activeSubscriptions: 0,
          trialingCount: 0,
          trialsExpiringSoon: 0,
          minutesThisMonth: 0,
          finalizedThisMonth: 0,
          finalizedMinutes: 0,
          newClubsThisMonth: 0,
          totalMeetings: 0,
          totalMembers: 0,
        };
      }),
      getExpiringTrials().catch((e) => {
        console.error("[admin] getExpiringTrials:", e);
        return [];
      }),
      getSubscriptionBreakdown().catch((e) => {
        console.error("[admin] getSubscriptionBreakdown:", e);
        return { byPlan: [], byStatus: [] };
      }),
      getAdminAuditLogs().catch((e) => {
        console.error("[admin] getAdminAuditLogs:", e);
        return [];
      }),
      getHealthChecks(),
      getProductAnalytics(),
    ]);

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("stats.activeClubs")}
            value={stats.clubsActive}
            subtitle={
              stats.clubsInactive > 0
                ? `${stats.clubsInactive} ${t("stats.inactive")}`
                : undefined
            }
            icon={Building2}
          />
          <StatCard title={t("stats.users")} value={stats.usersCount} icon={Users} />
          <StatCard
            title={t("stats.subscriptions")}
            value={stats.activeSubscriptions}
            subtitle={`${stats.trialingCount} ${t("stats.trialing")}`}
            icon={CreditCard}
          />
          <StatCard
            title={t("stats.minutesMonth")}
            value={stats.minutesThisMonth}
            subtitle={`${stats.finalizedThisMonth} ${t("stats.finalized")} ${t("stats.thisMonth")}`}
            icon={Activity}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("stats.newClubs")}
            value={stats.newClubsThisMonth}
            icon={Building2}
            trend="up"
          />
          <StatCard title={t("stats.meetings")} value={stats.totalMeetings} icon={Calendar} />
          <StatCard title={t("stats.members")} value={stats.totalMembers} icon={UserCheck} />
          <StatCard
            title={t("stats.trialsExpiring")}
            value={stats.trialsExpiringSoon}
            icon={Clock}
            trend={stats.trialsExpiringSoon > 0 ? "down" : "neutral"}
          />
        </div>

        <HealthDashboard health={health} />

        <AnalyticsPanel analytics={analytics} locale={locale} />

        <div className="grid lg:grid-cols-2 gap-6">
          <TrialAlerts trials={expiringTrials} locale={locale} />
          <SubscriptionBreakdown data={subscriptionBreakdown} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/admin/clubs`} className="text-sm text-navy font-medium hover:underline">
            Gérer les clubs →
          </Link>
          <Link href={`/${locale}/admin/users`} className="text-sm text-navy font-medium hover:underline">
            Gérer les utilisateurs →
          </Link>
          <Link href={`/${locale}/admin/roles`} className="text-sm text-navy font-medium hover:underline">
            Configurer les rôles →
          </Link>
        </div>

        <AuditLogList logs={auditLogs} locale={locale} />
      </div>
  );
}