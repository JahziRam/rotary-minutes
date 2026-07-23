import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar, Users, Mail, ArrowRight, CheckSquare, Wallet } from "lucide-react";
import { getSession } from "@/lib/cached-auth";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getTreasuryDashboardSummary } from "@/lib/queries/treasury";
import { getMembersDuesOverview } from "@/lib/queries/dues-overview";
import { formatBudgetMoney } from "@/lib/budget-utils";
import { hasRolePermission } from "@/lib/roles";
import { canManageMemberRoles } from "@/lib/member-roles";
import { getRoleLabel } from "@/lib/role-labels";
import { CLUB_ROLES } from "@/lib/rotary";
import { getMinuteStatusLabel, getMinuteStatusVariant } from "@/lib/minute-status";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { ClubHealthScorePanel } from "@/components/dashboard/club-health-score-panel";
import {
  PendingJoinRequests,
  type PendingJoinRequest,
} from "@/components/dashboard/pending-join-requests";
import { getPendingJoinRequests } from "@/actions/registration";
import {
  canManageClubOnboarding,
  getOnboardingBootstrap,
  syncClubOnboardingProgress,
} from "@/actions/onboarding";
import { isOnboardingComplete } from "@/lib/onboarding-steps";
import { OnboardingChecklist } from "@/components/members/onboarding-checklist";
import { MemberWelcomeCard } from "@/components/onboarding/member-welcome-card";
import { ClubSetupPendingBanner } from "@/components/onboarding/club-setup-pending-banner";
import { DashboardAssistance } from "@/components/assistance/dashboard-assistance";
import { GuidedEmptyStateClient } from "@/components/assistance/guided-empty-state-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppName } from "@/lib/app-settings";
import { getViewAsClubId } from "@/lib/view-as-club";
import { ViewAsClubPicker } from "@/components/layout/view-as-club-picker";
import { getMemberHubSummary } from "@/lib/queries/member-hub";
import { getVapidPublicKey } from "@/lib/vapid-config";
import { isWebPushEnabledForUser } from "@/lib/push-preference";
import { MemberMobileHub } from "@/components/member-portal/member-mobile-hub";
import { RecentMemberEngagement } from "@/components/dashboard/recent-member-engagement";
import {
  canViewMemberEngagement,
  getRecentMemberEngagement,
} from "@/lib/queries/member-engagement";
import { MeetingsMinutesMaintenanceNotice } from "@/components/layout/meetings-minutes-maintenance-notice";
import { isMeetingsMinutesMaintenanceActive } from "@/lib/meetings-minutes-maintenance";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tDashboard = await getTranslations("dashboard");
  const session = await getSession();
  const ctx = await getClubContext();

  let clubSetupIncomplete = false;
  let canDriveOnboarding = false;
  if (ctx && !ctx.isSuperAdmin) {
    canDriveOnboarding = await canManageClubOnboarding(ctx);
    const onboarding = await syncClubOnboardingProgress(ctx.clubId);
    clubSetupIncomplete = !isOnboardingComplete(
      onboarding.currentStep,
      onboarding.completedAt,
      onboarding.completedSteps
    );
    // Only officers who can configure the club are forced into the setup wizard.
    // Invited members / readers keep access to the app.
    if (clubSetupIncomplete && canDriveOnboarding) {
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
  let treasurySummary: Awaited<ReturnType<typeof getTreasuryDashboardSummary>> | null =
    null;
  if (ctx && canViewTreasury) {
    try {
      treasurySummary = await getTreasuryDashboardSummary(ctx.clubId);
    } catch (error) {
      console.error("[dashboard] treasury summary failed", ctx.clubId, error);
    }
  }
  const duesOverview =
    ctx && isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin)
      ? await hasRolePermission(ctx.role, "dues.view", ctx.isSuperAdmin).then((ok) =>
          ok ? getMembersDuesOverview(ctx.clubId) : null
        )
      : null;

  const appName = await getAppName();
  const clubName = ctx?.clubName ?? appName;
  const liveVisible = ctx
    ? isFeatureVisibleInUi(ctx.features, "liveMeetings", ctx.isSuperAdmin)
    : true;

  const canManageMembers =
    ctx && !ctx.isSuperAdmin
      ? await hasRolePermission(ctx.role, "members.manage", false)
      : ctx?.isSuperAdmin ?? false;
  let pendingRequests: PendingJoinRequest[] = [];
  let canManageRoles = false;
  let pendingRoleOptions: Array<{ value: string; label: string }> = [];
  let pendingCustomRoles: Array<{ id: string; label: string }> = [];
  if (ctx && canManageMembers) {
    const [pendingJoinResult, roleManage, customRoles] = await Promise.all([
      getPendingJoinRequests(),
      canManageMemberRoles(ctx),
      ctx.isSuperAdmin
        ? prisma.customRole.findMany({
            where: { isActive: true },
            orderBy: { key: "asc" },
          })
        : Promise.resolve([]),
    ]);
    canManageRoles = roleManage;
    pendingRoleOptions = CLUB_ROLES.map((r) => ({
      value: r,
      label: getRoleLabel(r, locale),
    }));
    pendingCustomRoles = customRoles.map((r) => ({
      id: r.id,
      label: locale === "fr" ? r.labelFr : r.labelEn,
    }));
    if (pendingJoinResult && "requests" in pendingJoinResult) {
      pendingRequests = pendingJoinResult.requests ?? [];
    }
  }

  const onboardingBootstrap =
    ctx && !ctx.isSuperAdmin && canDriveOnboarding && clubSetupIncomplete
      ? await getOnboardingBootstrap()
      : null;

  const membershipHints =
    ctx && !ctx.isSuperAdmin
      ? await prisma.clubMembership.findUnique({
          where: {
            clubId_userId: { clubId: ctx.clubId, userId: session!.user!.id },
          },
          select: { dismissedHints: true },
        })
      : null;
  const showMemberWelcome =
    !!ctx &&
    !ctx.isSuperAdmin &&
    ctx.club.guideEnabled &&
    !canDriveOnboarding &&
    !(membershipHints?.dismissedHints ?? []).includes("member_welcome_v1");

  const linkedMember =
    !!ctx &&
    !!session?.user?.id &&
    !!(await prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: session.user.id },
      select: { id: true },
    }));

  const viewAsClubs =
    session?.user?.isSuperAdmin && !ctx
      ? await prisma.club.findMany({
          where: { isActive: true },
          select: { id: true, name: true, city: true },
          orderBy: { name: "asc" },
        })
      : [];
  const viewAsClubId = session?.user?.isSuperAdmin ? await getViewAsClubId() : null;

  const memberPortalOn =
    ctx && isFeatureEnabled(ctx.features, "memberPortalEnabled", ctx.isSuperAdmin);
  const isReaderMember = ctx?.role === "READER" && !ctx.isSuperAdmin;
  const memberHubSummary =
    ctx && memberPortalOn && isReaderMember && session?.user?.id
      ? await getMemberHubSummary(ctx.clubId, session.user.id)
      : null;
  const [vapidPublicKey, webPushEnabled] = memberHubSummary
    ? await Promise.all([
        getVapidPublicKey(),
        isWebPushEnabledForUser(session!.user!.id, ctx!.clubId),
      ])
    : [null, true];

  const showMemberEngagement =
    !!ctx && canViewMemberEngagement(ctx.role, ctx.isSuperAdmin);
  const memberEngagement = showMemberEngagement
    ? await getRecentMemberEngagement(ctx.clubId, 12)
    : [];

  return (
    <AppShellServer title={t("nav.dashboard")}>
      <div className="space-y-8">
        {pendingRequests.length > 0 && (
          <PendingJoinRequests
            requests={pendingRequests}
            canManageRoles={canManageRoles}
            roleOptions={pendingRoleOptions}
            customRoles={pendingCustomRoles}
          />
        )}

        {onboardingBootstrap &&
          onboardingBootstrap.currentStep !== "COMPLETE" && (
            <OnboardingChecklist
              completedSteps={onboardingBootstrap.completedSteps}
              currentStep={onboardingBootstrap.currentStep}
              progressPercent={onboardingBootstrap.progressPercent}
            />
          )}

        {clubSetupIncomplete && !canDriveOnboarding && ctx && (
          <ClubSetupPendingBanner clubName={ctx.clubName} />
        )}

        {showMemberWelcome && ctx && (
          <MemberWelcomeCard
            firstName={userName}
            clubName={ctx.clubName}
            linkedMember={linkedMember}
            showDues={isFeatureEnabled(
              ctx.features,
              "duesEnabled",
              ctx.isSuperAdmin
            )}
          />
        )}

        <DashboardAssistance />

        {isMeetingsMinutesMaintenanceActive() && (
          <MeetingsMinutesMaintenanceNotice locale={locale} />
        )}

        {session?.user?.isSuperAdmin && !ctx ? (
          <ViewAsClubPicker
            clubs={viewAsClubs}
            locale={locale}
            currentClubId={viewAsClubId}
          />
        ) : (
          <>
            <DashboardHero
              greeting={`${tDashboard("welcome")}${userName ? `, ${userName}` : ""}`}
              clubName={clubName}
              newMeetingLabel={tDashboard("newMeeting")}
              newMinuteLabel={tDashboard("newMinute")}
              locale={locale}
            />

            {memberHubSummary && (
              <MemberMobileHub
                locale={locale}
                summary={memberHubSummary}
                vapidPublicKey={vapidPublicKey}
                webPushEnabled={webPushEnabled}
              />
            )}

            {ctx && (
              <ClubHealthScorePanel clubId={ctx.clubId} locale={locale} />
            )}

            <DashboardSection title={tDashboard("statsSection")}>
              <div
                className={`grid sm:grid-cols-2 ${treasurySummary ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}
              >
                {treasurySummary && ctx && (
                  <Link href={`/${locale}/treasury`}>
                    <StatCard
                      title={tDashboard("treasuryBalance")}
                      value={formatBudgetMoney(treasurySummary.balance, ctx.club.currency, locale)}
                      subtitle={
                        duesOverview && duesOverview.overdueCount > 0
                          ? tDashboard("treasuryOverdue", { count: duesOverview.overdueCount })
                          : treasurySummary.fiscalYearLabel
                      }
                      icon={Wallet}
                      accent="gold"
                      className="hover:shadow-md transition-shadow cursor-pointer h-full"
                    />
                  </Link>
                )}
                <Link href={`/${locale}/statistics`}>
                  <StatCard
                    title={tDashboard("attendanceRate")}
                    value={`${stats?.annualAttendance ?? 0}%`}
                    subtitle={
                      stats?.mandateLabel
                        ? `${t("attendance.annualRate")} · ${stats.mandateLabel}`
                        : t("attendance.annualRate")
                    }
                    icon={Users}
                    trend={stats && stats.annualAttendance >= 75 ? "up" : "neutral"}
                    accent="green"
                    className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  />
                </Link>
                <Link href={`/${locale}/meetings`}>
                  <StatCard
                    title={tDashboard("meetingsThisMonth")}
                    value={stats?.meetingsThisMonth ?? 0}
                    subtitle={
                      stats?.meetingsCount !== undefined
                        ? `${stats.meetingsCount} ${tDashboard("pastMeetings")} (${stats.mandateLabel})`
                        : undefined
                    }
                    icon={Calendar}
                    accent="navy"
                    className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  />
                </Link>
                <Link href={`/${locale}/actions`}>
                  <StatCard
                    title={tDashboard("openActions")}
                    value={stats?.openActions ?? 0}
                    subtitle={tDashboard("openActionsSubtitle")}
                    icon={CheckSquare}
                    accent="amber"
                    className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  />
                </Link>
                <Link href={`/${locale}/emails`}>
                  <StatCard
                    title={tDashboard("scheduledEmails")}
                    value={stats?.scheduledEmails ?? 0}
                    icon={Mail}
                    className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  />
                </Link>
              </div>
            </DashboardSection>

            <DashboardSection title={tDashboard("activitySection")}>
              <div
                className={`grid gap-6 ${
                  showMemberEngagement
                    ? "lg:grid-cols-3"
                    : "lg:grid-cols-2"
                }`}
              >
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{tDashboard("nextMeeting")}</CardTitle>
                    <Link
                      href={`/${locale}/meetings`}
                      className="text-sm text-navy hover:underline flex items-center gap-1"
                    >
                      {t("common.viewAll")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {stats?.nextMeeting ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-navy/5">
                          <div className="h-12 w-12 rounded-lg bg-navy text-white flex flex-col items-center justify-center text-xs font-bold">
                            <span>
                              {format(stats.nextMeeting.date, "dd", {
                                locale: dateLocale,
                              })}
                            </span>
                            <span className="text-[10px] uppercase">
                              {format(stats.nextMeeting.date, "MMM", {
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {format(stats.nextMeeting.date, "EEEE d MMMM yyyy", {
                                locale: dateLocale,
                              })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {stats.nextMeeting.location} ·{" "}
                              {stats.nextMeeting.startTime}
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
                      <div className="py-2">
                        <GuidedEmptyStateClient stateKey="dashboard_meetings" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{tDashboard("recentMinutes")}</CardTitle>
                    <Link
                      href={`/${locale}/minutes`}
                      className="text-sm text-navy hover:underline flex items-center gap-1"
                    >
                      {t("common.viewAll")}
                      <ArrowRight className="h-3 w-3" />
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
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {pv.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {pv.author
                                    ? `${pv.author.firstName} ${pv.author.lastName}`
                                    : ""}
                                </p>
                              </div>
                              <Badge variant={getMinuteStatusVariant(pv.status)}>
                                {getMinuteStatusLabel(pv.status, (k) =>
                                  t(k as "minutes.finalized")
                                )}
                              </Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-2">
                        <GuidedEmptyStateClient stateKey="dashboard_minutes" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {showMemberEngagement && (
                  <RecentMemberEngagement
                    locale={locale}
                    items={memberEngagement}
                  />
                )}
              </div>
            </DashboardSection>
          </>
        )}
      </div>
    </AppShellServer>
  );
}