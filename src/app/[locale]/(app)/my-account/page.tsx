import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/cached-auth";
import { getClubContext } from "@/lib/club-context";
import { getMyAccountData } from "@/actions/member-portal";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { MyAccountPanel } from "@/components/member-portal/my-account-panel";
import { PageAssistance } from "@/components/assistance/page-assistance";
import { WebPushEnable } from "@/components/notifications/web-push-enable";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getVapidPublicKey } from "@/lib/vapid-config";
import { isWebPushEnabledForUser } from "@/lib/push-preference";

export default async function MyAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("memberPortal");
  const session = await getSession();
  const ctx = await getClubContext();
  if (!ctx) {
    if (session?.user?.isSuperAdmin) redirect(`/${locale}/dashboard`);
    redirect(`/${locale}/login`);
  }

  const data = await getMyAccountData();
  if ("error" in data) {
    if (data.error === "FEATURE_DISABLED") {
      return (
        <AppShellServer title={t("title")}>
          <FeatureUnavailable
            feature="memberPortalEnabled"
            locale={locale}
            plan={ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{t("unauthorized")}</p>
      </AppShellServer>
    );
  }

  const panelData =
    data.linked === false
      ? {
          canAutoLink: data.canAutoLink,
          emailMatchMember: data.emailMatchMember,
          userEmail: data.userEmail,
        }
      : {
          member: data.member,
          duesSummary: {
            ...data.duesSummary,
            pending: data.duesSummary.pending.map((d) => ({
              id: d.id,
              amount: Number(d.amount),
              status: d.status,
              dueDate: d.dueDate.toISOString(),
              periodLabel: d.periodLabel,
            })),
            paid: data.duesSummary.paid.map((d) => ({
              id: d.id,
              amount: Number(d.amount),
              status: d.status,
            })),
          },
          attendances: data.attendances,
          attendanceStats: data.attendanceStats,
          mandateAttendance: data.mandateAttendance,
          finalizedMinutes: data.finalizedMinutes,
          eventRegistrations: data.eventRegistrations,
          duesPayment: data.duesPayment,
          actions: data.actions,
          documents: data.documents,
          emailLogs: data.emailLogs,
        };

  const [vapidPublicKey, webPushEnabled] = await Promise.all([
    getVapidPublicKey(),
    isWebPushEnabledForUser(ctx.userId, ctx.clubId),
  ]);

  return (
    <AppShellServer title={t("title")}>
      <PageAssistance hints={["profile_intro", "profile_save_action"]} />
      <div className="space-y-6">
        <ChangePasswordForm />
        <WebPushEnable
          vapidPublicKey={vapidPublicKey}
          preferenceEnabled={webPushEnabled}
        />
        <MyAccountPanel data={panelData} locale={locale} />
      </div>
    </AppShellServer>
  );
}