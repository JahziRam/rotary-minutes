"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Mail, AlertTriangle, TrendingUp, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { StatCard } from "@/components/dashboard/stat-card";
import { emailReportToDistrict } from "@/actions/attendance-reports";
import type { MemberAttendanceRate, PeriodAttendanceRate, MeetingTypeRate } from "@/lib/queries/attendance-reports";

type AtRisk = MemberAttendanceRate & { threshold: number };

export function AttendanceReportsPanel({
  clubRate,
  mandateLabel,
  meetingsCount,
  memberRates,
  periodRates,
  meetingTypeRates,
  atRisk,
  canExport,
  locale,
}: {
  clubRate: number;
  mandateLabel: string;
  meetingsCount: number;
  memberRates: MemberAttendanceRate[];
  periodRates: PeriodAttendanceRate[];
  meetingTypeRates: MeetingTypeRate[];
  atRisk: AtRisk[];
  canExport: boolean;
  locale: string;
}) {
  const t = useTranslations("attendanceReports");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleEmail() {
    startTransition(async () => {
      const result = await emailReportToDistrict(locale);
      if ("success" in result && result.success) setToast(t("emailSent"));
      else if ("error" in result && result.error === "NO_CLUB_EMAIL") setToast(t("noClubEmail"));
      else if ("error" in result && result.error === "PDF_DISABLED") setToast(t("pdfDisabled"));
      else setToast(t("emailError"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-assist="attendance-overview">
        <p className="text-sm text-gray-500">
          {t("mandate")} {mandateLabel}
        </p>
        {canExport && (
          <div className="flex gap-2">
            <a
              href={`/api/attendance-reports/export?locale=${locale}`}
              target="_blank"
              rel="noopener noreferrer"
              data-assist="attendance-export"
              className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
            >
              <Download className="h-4 w-4" />
              {t("exportPdf")}
            </a>
            <Button variant="outline" size="sm" disabled={pending} onClick={handleEmail}>
              <Mail className="h-4 w-4" />
              {t("emailDistrict")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title={t("clubRate")}
          value={`${clubRate}%`}
          icon={TrendingUp}
          trend={clubRate >= 75 ? "up" : clubRate >= 50 ? "neutral" : "down"}
        />
        <StatCard title={t("meetingsCount")} value={meetingsCount} icon={Calendar} />
        <StatCard title={t("membersTracked")} value={memberRates.length} icon={Users} />
      </div>

      {atRisk.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("atRiskTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {atRisk.map((m) => (
              <div key={m.memberId} className="flex items-center justify-between text-sm text-amber-800">
                <span>
                  {m.firstName} {m.lastName}
                </span>
                <Badge variant="warning">
                  {m.rate}% ({m.total} {t("meetings")})
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("byMember")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {memberRates.map((m) => (
              <div key={m.memberId} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-32 truncate">
                  {m.firstName} {m.lastName}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.rate < 50 ? "bg-red-500" : m.rate < 75 ? "bg-amber-500" : "bg-navy"}`}
                    style={{ width: `${m.rate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-10 text-right">{m.rate}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("byPeriod")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {periodRates.map((p) => (
                <div key={p.period} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gold/80 rounded-t"
                    style={{ height: `${Math.max(p.rate, 4)}%` }}
                  />
                  <span className="text-[10px] text-gray-400">{p.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("byMeetingType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">{t("type")}</th>
                    <th className="pb-2 font-medium">{t("meetingsCount")}</th>
                    <th className="pb-2 font-medium">{t("rate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingTypeRates.map((row) => (
                    <tr key={row.type} className="border-b border-gray-100">
                      <td className="py-2">{t(`meetingTypes.${row.type}`)}</td>
                      <td className="py-2">{row.meetingsCount}</td>
                      <td className="py-2 font-medium">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}