"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { Calendar, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServerListPagination } from "@/components/ui/list-controls";
import { CalendarExport } from "@/components/meetings/calendar-export";
import { MeetingListActions } from "@/components/meetings/meeting-list-actions";
import type { PaginatedResult } from "@/lib/server-list";

export type MeetingListItem = {
  id: string;
  date: string;
  type: string;
  location: string | null;
  presidedBy: string | null;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  isLive: boolean;
  attendanceRate: number | null;
  agendaTitles: string[];
  minuteId: string | null;
  clubName: string;
};

export function MeetingsList({
  meetings,
  locale,
  liveEnabled,
  scheduledId,
  initialQuery = "",
  listParams,
}: {
  meetings: PaginatedResult<MeetingListItem>;
  locale: string;
  liveEnabled: boolean;
  scheduledId?: string | null;
  initialQuery?: string;
  listParams: Record<string, string | undefined>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const today = startOfDay(new Date());
  const basePath = `/${locale}/meetings`;

  function applySearch(fd: FormData) {
    const q = (fd.get("q") as string)?.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (scheduledId) params.set("scheduled", scheduledId);
    router.push(`${basePath}?${params.toString()}`);
  }

  if (meetings.total === 0 && !initialQuery) return null;

  return (
    <div className="space-y-4">
      <form action={applySearch} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder={t("common.search")}
          className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </form>

      {meetings.items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{t("common.noResults")}</p>
      ) : (
        <div className="space-y-3">
          {meetings.items.map((meeting) => {
            const meetingDate = new Date(meeting.date);
            const isToday = isSameDay(meetingDate, today);
            const isUpcomingOrToday = startOfDay(meetingDate) >= today;
            const canStartLive = liveEnabled && !meeting.isLive && isUpcomingOrToday;
            const primaryHref =
              liveEnabled && meeting.isLive
                ? `/${locale}/meetings/${meeting.id}/live`
                : `/${locale}/meetings/${meeting.id}/attendance`;
            const agendaPreview = meeting.agendaTitles.slice(0, 3);
            const agendaMore = meeting.agendaTitles.length - agendaPreview.length;
            const isJustScheduled = scheduledId === meeting.id;

            return (
              <Card
                key={meeting.id}
                className={`hover:shadow-md transition-shadow ${
                  isJustScheduled ? "ring-2 ring-gold/50 border-gold/40" : ""
                } ${meeting.isLive ? "border-navy/30" : ""}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={primaryHref}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div
                        className={`h-14 w-14 rounded-xl text-white flex flex-col items-center justify-center shrink-0 ${
                          meeting.isLive ? "bg-green-700" : "bg-navy"
                        }`}
                      >
                        <Calendar className="h-5 w-5 mb-0.5 opacity-70" />
                        <span className="text-xs font-bold">
                          {format(meetingDate, "dd/MM", { locale: dateLocale })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {t(
                              `meetings.types.${meeting.type}` as "meetings.types.STATUTORY"
                            )}
                          </p>
                          {meeting.isLive && (
                            <Badge variant="success">{t("meetings.live")}</Badge>
                          )}
                          {isToday && !meeting.isLive && (
                            <Badge variant="muted">{t("meetings.today")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {meeting.location} · {meeting.presidedBy}
                        </p>
                        {agendaPreview.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            <span className="font-medium text-gray-500">
                              {t("meetings.agenda")}:
                            </span>{" "}
                            {agendaPreview.join(" · ")}
                            {agendaMore > 0 ? ` · +${agendaMore}` : ""}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {meeting.attendanceRate !== null && (
                        <Badge variant="success">{meeting.attendanceRate}%</Badge>
                      )}
                      <CalendarExport
                        meeting={{
                          id: meeting.id,
                          title: meeting.title,
                          date: meetingDate,
                          location: meeting.location,
                          startTime: meeting.startTime,
                          endTime: meeting.endTime,
                          clubName: meeting.clubName,
                        }}
                        locale={locale}
                        compact
                      />
                    </div>
                  </div>

                  <MeetingListActions
                    meetingId={meeting.id}
                    minuteId={meeting.minuteId}
                    locale={locale}
                    isLive={meeting.isLive}
                    canStartLive={canStartLive}
                    liveEnabled={liveEnabled}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ServerListPagination
        basePath={basePath}
        page={meetings.page}
        totalPages={meetings.totalPages}
        total={meetings.total}
        start={meetings.start}
        end={meetings.end}
        searchParams={listParams}
      />
    </div>
  );
}