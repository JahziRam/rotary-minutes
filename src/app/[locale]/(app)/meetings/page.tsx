import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Calendar } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { computeRecordedAttendanceRate } from "@/lib/rotary";


export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext();
  const dateLocale = locale === "fr" ? fr : enUS;

  const meetings = ctx
    ? await prisma.meeting.findMany({
        where: { clubId: ctx.clubId },
        include: { attendances: true, minute: { select: { id: true } } },
        orderBy: { date: "desc" },
      })
    : [];

  return (
    <AppShellServer title={t("meetings.title")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            {meetings.length} {t("meetings.title").toLowerCase()}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/meetings/new?from=last`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              {t("meetings.fromLast")}
            </Link>
            <Link
              href={`/${locale}/meetings/new`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("meetings.new")}
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {meetings.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">{t("common.noResults")}</p>
          ) : (
            meetings.map((meeting) => {
              const rate = computeRecordedAttendanceRate(meeting.attendances);
              const href = `/${locale}/meetings/${meeting.id}/attendance`;

              return (
                <Link key={meeting.id} href={href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-navy text-white flex flex-col items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 mb-0.5 opacity-70" />
                        <span className="text-xs font-bold">
                          {format(meeting.date, "dd/MM", { locale: dateLocale })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {t(`meetings.types.${meeting.type}` as "meetings.types.STATUTORY")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {meeting.location} · {meeting.presidedBy}
                        </p>
                      </div>
                      {rate !== null && <Badge variant="success">{rate}%</Badge>}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShellServer>
  );
}