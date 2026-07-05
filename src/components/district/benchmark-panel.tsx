"use client";

import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BenchmarkMetric = {
  label: string;
  clubValue: number;
  districtValue: number;
  suffix?: string;
};

function MetricRow({
  label,
  clubValue,
  districtValue,
  suffix = "",
}: BenchmarkMetric) {
  const max = Math.max(clubValue, districtValue, 1);
  const clubWidth = Math.round((clubValue / max) * 100);
  const districtWidth = Math.round((districtValue / max) * 100);
  const diff = clubValue - districtValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span
          className={cn(
            "text-xs font-medium",
            diff > 0 ? "text-green-600" : diff < 0 ? "text-amber-600" : "text-gray-400"
          )}
        >
          {diff > 0 ? "+" : ""}
          {diff}
          {suffix}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-navy w-14 shrink-0">
            Club
          </span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy rounded-full transition-all"
              style={{ width: `${Math.max(clubWidth, 4)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-900 w-12 text-right">
            {clubValue}
            {suffix}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 w-14 shrink-0">
            Dist.
          </span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold/80 rounded-full transition-all"
              style={{ width: `${Math.max(districtWidth, 4)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500 w-12 text-right">
            {districtValue}
            {suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BenchmarkPanel({
  district,
  mandateLabel,
  club,
  districtAverage,
}: {
  district: string;
  mandateLabel: string;
  club: {
    attendanceRate: number;
    meetingsCount: number;
    finalizedMinutesCount: number;
  };
  districtAverage: {
    attendanceRate: number;
    meetingsCount: number;
    finalizedMinutesCount: number;
  };
}) {
  const t = useTranslations("district");

  return (
    <Card className="border-navy/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-navy" />
          {t("benchmarkTitle")}
        </CardTitle>
        <p className="text-sm text-gray-500">
          {t("benchmarkSubtitle", { district, label: mandateLabel })}
        </p>
        <p className="text-xs text-gray-400">{t("benchmarkAnonymized")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <MetricRow
          label={t("attendance")}
          clubValue={club.attendanceRate}
          districtValue={districtAverage.attendanceRate}
          suffix="%"
        />
        <MetricRow
          label={t("meetingsCount")}
          clubValue={club.meetingsCount}
          districtValue={districtAverage.meetingsCount}
        />
        <MetricRow
          label={t("finalizedMinutes")}
          clubValue={club.finalizedMinutesCount}
          districtValue={districtAverage.finalizedMinutesCount}
        />
      </CardContent>
    </Card>
  );
}