import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getClubAnnualAttendance } from "@/lib/queries/attendance";
import { getMembersWithLowAttendance } from "@/lib/queries/members";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { requireFeature } from "@/lib/require-feature";
import { BenchmarkPanel } from "@/components/district/benchmark-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { getDistrictBenchmark } from "@/lib/queries/district";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { TreasuryStatisticsPanel } from "@/components/treasury/treasury-statistics-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp } from "lucide-react";

export default async function StatisticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const gate = await requireFeature("statisticsEnabled", { includeMembers: true });

  if ("error" in gate) {
    if (gate.error === "FEATURE_DISABLED") {
      return (
        <AppShellServer title={t("statistics.title")}>
          <FeatureUnavailable
            feature="statisticsEnabled"
            locale={locale}
            plan={gate.ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("statistics.title")}>
        <p className="text-gray-500">{t("common.noResults")}</p>
      </AppShellServer>
    );
  }

  const { ctx } = gate;
  const treasuryOn = isFeatureEnabled(ctx.features, "treasuryEnabled", ctx.isSuperAdmin);
  const canViewTreasury =
    treasuryOn &&
    (await hasRolePermission(ctx.role, "treasury.view", ctx.isSuperAdmin));

  const [attendance, lowAttendance, benchmark] = await Promise.all([
    getClubAnnualAttendance(ctx.clubId),
    getMembersWithLowAttendance(ctx.clubId),
    ctx.club.district ? getDistrictBenchmark(ctx.clubId) : Promise.resolve(null),
  ]);

  const meetings = attendance
    ? await prisma.meeting.findMany({
        where: {
          clubId: ctx.clubId,
          date: { gte: attendance.mandate.start, lte: attendance.mandate.end },
        },
        include: { attendances: { include: { member: true } } },
        orderBy: { date: "asc" },
      })
    : [];

  const members = ctx?.club.members ?? [];

  const memberAttendance: Record<string, { present: number; total: number }> = {};

  for (const m of meetings) {
    for (const a of m.attendances) {
      // Honorary members and guests never count toward assiduity stats.
      if (!a.memberId || a.member?.isHonoraryMember) continue;
      if (!memberAttendance[a.memberId]) memberAttendance[a.memberId] = { present: 0, total: 0 };
      memberAttendance[a.memberId].total++;
      if (
        a.category === "PRESENT" ||
        a.category === "TRAVEL_RETURN" ||
        a.category === "TRAVELING" ||
        a.category === "EXTERNAL_ATTENDANCE"
      ) {
        memberAttendance[a.memberId].present++;
      }
    }
  }

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthMeetings = meetings.filter((m) => m.date.getMonth() === i);
    let p = 0, tot = 0;
    for (const m of monthMeetings) {
      const countable = m.attendances.filter(
        (a) => !!a.memberId && !a.member?.isHonoraryMember
      );
      p += countable.filter(
        (a) =>
          a.category === "PRESENT" ||
          a.category === "TRAVEL_RETURN" ||
          a.category === "TRAVELING" ||
          a.category === "EXTERNAL_ATTENDANCE"
      ).length;
      tot += countable.length;
    }
    return tot > 0 ? Math.round((p / tot) * 100) : 0;
  });

  return (
    <AppShellServer title={t("statistics.title")}>
      <div className="space-y-6">
        {attendance && (
          <p className="text-sm text-gray-500">
            {t("statistics.annualAttendance")} — Mandat Rotary {attendance.mandate.label}
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard
            title={t("statistics.annualAttendance")}
            value={`${attendance?.rate ?? 0}%`}
            icon={TrendingUp}
            trend={attendance && attendance.rate >= 75 ? "up" : "neutral"}
          />
          <StatCard
            title={t("statistics.meetingsCount")}
            value={attendance?.meetingsCount ?? 0}
            icon={Calendar}
          />
          <StatCard title={t("members.title")} value={members.length} icon={Users} />
        </div>

        {lowAttendance.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-amber-900">{t("statistics.lowAttendanceAlert")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-amber-800">
              {lowAttendance.map(({ member, rate, total }) => (
                <p key={member.id}>
                  {member.firstName} {member.lastName} — {rate}% ({total}{" "}
                  {locale === "fr" ? "réunions" : "meetings"})
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {benchmark && (
          <BenchmarkPanel
            district={benchmark.district}
            mandateLabel={benchmark.mandate.label}
            club={benchmark.club}
            districtAverage={benchmark.districtAverage}
          />
        )}

        {canViewTreasury && (
          <TreasuryStatisticsPanel
            clubId={ctx.clubId}
            locale={locale}
            currency={ctx.club.currency}
          />
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t("statistics.byMember")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {members.map((m) => {
                const att = memberAttendance[m.id];
                const rate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 truncate">{m.firstName} {m.lastName}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-navy rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-10 text-right">{rate}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("statistics.byMonth")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {monthlyData.map((rate, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gold/80 rounded-t" style={{ height: `${Math.max(rate, 4)}%` }} />
                    <span className="text-[10px] text-gray-400">
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShellServer>
  );
}