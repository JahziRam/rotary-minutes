import { getTranslations, setRequestLocale } from "next-intl/server";
import { listReports } from "@/actions/attendance-reports";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { AttendanceReportsPanel } from "@/components/attendance/attendance-reports-panel";
import { getClubContext } from "@/lib/club-context";

export default async function AttendanceReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("attendanceReports");
  const ctx = await getClubContext();

  const data = await listReports();
  if ("error" in data) {
    if (data.error === "FEATURE_DISABLED" && ctx) {
      return (
        <AppShellServer title={t("title")}>
          <FeatureUnavailable
            feature="attendanceReportsEnabled"
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

  return (
    <AppShellServer title={t("title")}>
      <AttendanceReportsPanel
        clubRate={data.clubRate}
        mandateLabel={data.mandateLabel}
        meetingsCount={data.meetingsCount}
        memberRates={data.memberRates}
        periodRates={data.periodRates}
        meetingTypeRates={data.meetingTypeRates}
        atRisk={data.atRisk}
        canExport={data.canExport}
        locale={locale}
      />
    </AppShellServer>
  );
}