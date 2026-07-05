import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { DistrictOverview } from "@/components/district/district-overview";
import { requireDistrictPage } from "@/lib/require-district";
import { getDistrictOverview } from "@/lib/queries/district";
import { canViewDistrictMinutes } from "@/lib/district-access";

export default async function DistrictDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ district?: string }>;
}) {
  const { locale } = await params;
  const { district: districtParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const gate = await requireDistrictPage(districtParam);
  if ("error" in gate) {
    if (gate.error === "FEATURE_DISABLED" && gate.ctx) {
      return (
        <AppShellServer title={t("district.title")}>
          <FeatureUnavailable
            feature="districtDashboard"
            locale={locale}
            plan={gate.ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("district.title")}>
        <p className="text-gray-500">{t("district.unauthorized")}</p>
      </AppShellServer>
    );
  }

  const { district, accesses, ctx, session } = gate;
  const overview = await getDistrictOverview(district);
  const showMinutesLink = await canViewDistrictMinutes(session.id, district);

  const districtOptions = accesses.map((a) => a.district);

  return (
    <AppShellServer title={t("district.title")}>
      <div className="space-y-6">
        {districtOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {districtOptions.map((d) => (
              <Link
                key={d}
                href={`/${locale}/district?district=${encodeURIComponent(d)}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  d === district
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}
              </Link>
            ))}
          </div>
        )}

        <DistrictOverview
          locale={locale}
          district={district}
          mandateLabel={overview.mandate.label}
          totalClubs={overview.totalClubs}
          totalFinalizedMinutes={overview.totalFinalizedMinutes}
          avgAttendance={overview.avgAttendance}
          clubs={overview.clubs}
          showMinutesLink={showMinutesLink}
        />

        {ctx && !ctx.club.district && (
          <p className="text-xs text-gray-400">{t("district.governorMode")}</p>
        )}
      </div>
    </AppShellServer>
  );
}