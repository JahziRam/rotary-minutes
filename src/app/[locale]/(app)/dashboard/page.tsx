import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar, FileText, Users, Mail, Plus, ArrowRight, CheckSquare, Wallet } from "lucide-react";
import { getSession } from "@/lib/cached-auth";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getTreasuryDashboardSummary } from "@/lib/queries/treasury";
import { getMembersDuesOverview } from "@/lib/queries/dues-overview";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { hasRolePermission } from "@/lib/roles";
import { getMinuteStatusLabel, getMinuteStatusVariant } from "@/lib/minute-status";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { StatCard } from "@/components/dashboard/stat-card";
import { ClubHealthScorePanel } from "@/components/dashboard/club-health-score-panel";
import {
  PendingJoinRequests,
  type PendingJoinRequest,
} from "@/components/dashboard/pending-join-requests";
import { getPendingJoinRequests } from "@/actions/registration";
import { getClubOnboarding } from "@/actions/onboarding";
import { OnboardingChecklist } from "@/components/members/onboarding-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const ctx = await getClubContext();

  if (ctx && !ctx.isSuperAdmin) {
    const onboarding = await prisma.clubOnboarding.findUnique({
      where: { clubId: ctx.clubId },
    });
    if (
      onboarding &&
      onboarding.currentStep !== "COMPLETE" &&
      !onboarding.completedAt
    ) {
      redirect(`/${locale}/onboarding`);
    }
  }

  const dateLocale = locale === "fr" ? fr : enUS;
  const userName = session?.user?.name?.split(" ")[0] ?? "";

  const stats =
    ctx && session?.user?.id
      ? await getDashboardStats(ctx.clubId, session.user.id)
      : null;

  const treasuryOn = ctx
    ? isFeatureEnabled(ctx.features, "treasuryEnabled", ctx.isSuperAdmin)
    : false;
  const canViewTreasury =
    ctx && treasuryOn
      ? await hasRolePermission(ctx.role, "treasury.view", ctx.isSuperAdmin)
      : false;
  const treasurySummary =
    ctx && canViewTreasury ? await getTreasuryDashboardSummary(ctx.clubId) : null;
  const duesOverview =
    ctx && isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin)
      ? await hasRolePermission(ctx.role, "dues.view", ctx.isSuperAdmin).then((ok) =>
          ok ? getMembersDuesOverview(ctx.clubId) : null
        )
      : null;

  const clubName = ctx?.clubName ?? "Rotary Minutes";
  const liveVisible = ctx
    ? isFeatureVisibleInUi(ctx.features, "liveMeetings", ctx.isSuperAdmin)
    : true;

  const canManageMembers =
    ctx && !ctx.isSuperAdmin
      ? await hasRolePermission(ctx.role, "members.manage", false)
      : ctx?.isSuperAdmin ?? false;
  let pendingRequests: PendingJoinRequest[] = [];
  if (ctx && canManageMembers) {
    const pendingJoinResult = await getPendingJoinRequests();
    if (pendingJoinResult && "requests" in pendingJoinResult) {
      pendingRequests = pendingJoinResult.requests ?? [];
    }
  }

  const showGuide =
    ctx &&
    !ctx.isSuperAdmin &&
    ctx.club.guideEnabled &&
    canManageMembers;
  const onboardingGuide =
    showGuide ? await getClubOnboarding() : null;

  return (
    <AppShellServer title={t("nav.dashboard")}>
      <div className="space-y-8">
        {pendingRequests.length > 0 && (
          <PendingJoinRequests requests={pendingRequests} />
        )}

        {onboardingGuide && onboardingGuide.currentStep !== "COMPLETE" && (
          <OnboardingChecklist
            completedSteps={onboardingGuide.completedSteps}
            currentStep={onboardingGuide.currentStep}
          />
        )}

        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("dashboard.welcome")}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-white/70 mt-1">{clubName}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href={`/${locale}/meetings/new`}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              {t("dashboard.newMeeting")}
            </Link>
            <Link
              href={`/${locale}/minutes/new`}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg text-sm font-medium border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <FileText className="h-4 w-4" />
              {t("dashboard.newMinute")}
            </Link>
          </div>
        </section>

        {ctx && (
          <ClubHealthScorePanel clubId={ctx.clubId} locale={locale} />
        )}

        {/* Stats */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {t("dashboard.statsSection")}
          </h2>
          <div
            className={`grid sm:grid-cols-2 ${treasurySummary ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}
          >
            {treasurySummary && ctx && (
              <Link href={`/${locale}/treasury`}>
                <StatCard
                  title={t("dashboard.treasuryBalance")}
                  value={formatBudgetMoney(treasurySummary.balance, ctx.club.currency, locale)}
                  subtitle={
                    duesOverview && duesOverview.overdueCount > 0
                      ? t("dashboard.treasuryOverdue", { count: duesOverview.overdueCount })
                      : treasurySummary.fiscalYearLabel
                  }
                  icon={Wallet}
                  className="hover:shadow-md transition-shadow cursor-pointer h-full"
                />
              </Link>
            )}
            <Link href={`/${locale}/statistics`}>
              <StatCard
                title={t("dashboard.attendanceRate")}
                value={`${stats?.annualAttendance ?? 0}%`}
                subtitle={
                  stats?.mandateLabel
                    ? `${t("attendance.annualRate")} · ${stats.mandateLabel}`
                    : t("attendance.annualRate")
                }
                icon={Users}
                trend={stats && stats.annualAttendance >= 75 ? "up" : "neutral"}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
              />
            </Link>
            <Link href={`/${locale}/meetings`}>
              <StatCard
                title={t("dashboard.meetingsThisMonth")}
                value={stats?.meetingsThisMonth ?? 0}
                subtitle={
                  stats?.meetingsCount !== undefined
                    ? `${stats.meetingsCount} ${t("dashboard.pastMeetings")} (${stats.mandateLabel})`
                    : undefined
                }
                icon={Calendar}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
              />
            </Link>
            <Link href={`/${locale}/actions`}>
              <StatCard
                title={t("dashboard.openActions")}
                value={stats?.openActions ?? 0}
                subtitle={t("dashboard.openActionsSubtitle")}
                icon={CheckSquare}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
              />
            </Link>
            <Link href={`/${locale}/emails`}>
              <StatCard
                title={t("dashboard.scheduledEmails")}
                value={stats?.scheduledEmails ?? 0}
                icon={Mail}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
              />
            </Link>
          </div>
        </section>

        {/* Meetings & minutes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {t("dashboard.activitySection")}
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t("dashboard.nextMeeting")}</CardTitle>
                <Link href={`/${locale}/meetings`} className="text-sm text-navy hover:underline flex items-center gap-1">
                  {t("common.viewAll")}<ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.nextMeeting ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-navy/5">
                      <div className="h-12 w-12 rounded-lg bg-navy text-white flex flex-col items-center justify-center text-xs font-bold">
                        <span>{format(stats.nextMeeting.date, "dd", { locale: dateLocale })}</span>
                        <span className="text-[10px] uppercase">{format(stats.nextMeeting.date, "MMM", { locale: dateLocale })}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(stats.nextMeeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {stats.nextMeeting.location} · {stats.nextMeeting.startTime}
                        </p>
                      </div>
                    </div>
                    {liveVisible && (
                      <Link
                        href={`/${locale}/meetings/${stats.nextMeeting.id}/live`}
                        className="flex items-center justify-center w-full h-10 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-all"
                      >
                        {t("meetings.live")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-gray-500 text-sm">{t("common.noResults")}</p>
                    <Link
                      href={`/${locale}/meetings/new`}
                      className="inline-flex items-center gap-2 text-sm text-navy font-medium hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      {t("dashboard.newMeeting")}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t("dashboard.recentMinutes")}</CardTitle>
                <Link href={`/${locale}/minutes`} className="text-sm text-navy hover:underline flex items-center gap-1">
                  {t("common.viewAll")}<ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.recentMinutes && stats.recentMinutes.length > 0 ? (
                  <ul className="space-y-2">
                    {stats.recentMinutes.map((pv) => (
                      <li key={pv.id}>
                        <Link
                          href={`/${locale}/minutes/${pv.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{pv.title}</p>
                            <p className="text-xs text-gray-400">
                              {pv.author ? `${pv.author.firstName} ${pv.author.lastName}` : ""}
                            </p>
                          </div>
                          <Badge variant={getMinuteStatusVariant(pv.status)}>
                            {getMinuteStatusLabel(pv.status, (k) => t(k as "minutes.finalized"))}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-gray-500 text-sm">{t("common.noResults")}</p>
                    <Link
                      href={`/${locale}/meetings/new`}
                      className="inline-flex items-center gap-2 text-sm text-navy font-medium hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      {t("dashboard.newMeeting")}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShellServer>
  );
}