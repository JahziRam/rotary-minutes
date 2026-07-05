import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText } from "lucide-react";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireDistrictPage } from "@/lib/require-district";
import { getDistrictFinalizedMinutes } from "@/lib/queries/district";
import { canViewDistrictMinutes } from "@/lib/district-access";

export default async function DistrictMinutesPage({
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
  const dateLocale = locale === "fr" ? fr : enUS;

  const gate = await requireDistrictPage(districtParam);
  if ("error" in gate) {
    return (
      <AppShellServer title={t("district.minutesTitle")}>
        <p className="text-gray-500">{t("district.unauthorized")}</p>
      </AppShellServer>
    );
  }

  const { district, session } = gate;
  const canView = await canViewDistrictMinutes(session.id, district);
  if (!canView && !gate.isSuperAdmin) {
    return (
      <AppShellServer title={t("district.minutesTitle")}>
        <p className="text-gray-500">{t("district.minutesForbidden")}</p>
      </AppShellServer>
    );
  }

  const minutes = await getDistrictFinalizedMinutes(district);

  return (
    <AppShellServer title={t("district.minutesTitle")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("district.minutesTitle")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("district.minutesSubtitle", { district })}
            </p>
          </div>
          <Link
            href={`/${locale}/district${districtParam ? `?district=${encodeURIComponent(district)}` : ""}`}
            className="text-sm text-navy hover:underline"
          >
            {t("district.backToDashboard")}
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-navy" />
              {t("district.finalizedMinutes")} ({minutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">{t("district.minuteTitle")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("district.clubName")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("district.meetingDate")}</th>
                  <th className="pb-3 font-medium">{t("district.status")}</th>
                </tr>
              </thead>
              <tbody>
                {minutes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      {t("district.noMinutes")}
                    </td>
                  </tr>
                ) : (
                  minutes.map((minute) => (
                    <tr key={minute.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/${locale}/minutes/${minute.id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {minute.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{minute.club.name}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {format(minute.meeting.date, "PPP", { locale: dateLocale })}
                      </td>
                      <td className="py-3">
                        <Badge variant="success">{minute.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400">{t("district.readOnlyNotice")}</p>
      </div>
    </AppShellServer>
  );
}