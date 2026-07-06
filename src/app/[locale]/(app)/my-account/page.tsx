import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { getMyAccountData } from "@/actions/member-portal";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { MyAccountPanel } from "@/components/member-portal/my-account-panel";

export default async function MyAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("memberPortal");
  const ctx = await getClubContext();
  if (!ctx) redirect(`/${locale}/login`);

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
          actions: data.actions,
          documents: data.documents,
          emailLogs: data.emailLogs,
        };

  return (
    <AppShellServer title={t("title")}>
      <MyAccountPanel data={panelData} locale={locale} />
    </AppShellServer>
  );
}