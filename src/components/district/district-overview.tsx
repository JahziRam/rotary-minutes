"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, FileCheck, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DistrictClubStat } from "@/lib/queries/district";

export function DistrictOverview({
  locale,
  district,
  mandateLabel,
  totalClubs,
  totalFinalizedMinutes,
  avgAttendance,
  clubs,
  showMinutesLink = false,
}: {
  locale: string;
  district: string;
  mandateLabel: string;
  totalClubs: number;
  totalFinalizedMinutes: number;
  avgAttendance: number;
  clubs: DistrictClubStat[];
  showMinutesLink?: boolean;
}) {
  const t = useTranslations("district");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {t("overviewTitle", { district })}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t("mandateLabel", { label: mandateLabel })}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title={t("clubsCount")} value={totalClubs} icon={Building2} />
        <StatCard
          title={t("finalizedMinutes")}
          value={totalFinalizedMinutes}
          icon={FileCheck}
        />
        <StatCard
          title={t("avgAttendance")}
          value={`${avgAttendance}%`}
          icon={TrendingUp}
          trend={avgAttendance >= 75 ? "up" : "neutral"}
        />
      </div>

      {showMinutesLink && (
        <div className="flex justify-end">
          <Link
            href={`/${locale}/district/minutes`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("viewMinutes")}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-navy" />
            {t("clubsTable")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 pr-4 font-medium">{t("clubName")}</th>
                <th className="pb-3 pr-4 font-medium">{t("city")}</th>
                <th className="pb-3 pr-4 font-medium text-right">{t("members")}</th>
                <th className="pb-3 pr-4 font-medium text-right">{t("finalizedMinutes")}</th>
                <th className="pb-3 font-medium text-right">{t("attendance")}</th>
              </tr>
            </thead>
            <tbody>
              {clubs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    {t("noClubs")}
                  </td>
                </tr>
              ) : (
                clubs.map((club) => (
                  <tr key={club.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{club.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{club.city}</td>
                    <td className="py-3 pr-4 text-right text-gray-700">{club.memberCount}</td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {club.finalizedMinutesCount}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={
                          club.attendanceRate >= 75
                            ? "text-green-700 font-medium"
                            : "text-gray-700"
                        }
                      >
                        {club.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}