"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { CalendarExport } from "@/components/meetings/calendar-export";
import { MeetingListActions } from "@/components/meetings/meeting-list-actions";

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
}: {
  meetings: MeetingListItem[];
  locale: string;
  liveEnabled: boolean;
  scheduledId?: string | null;
}) {
  const t = useTranslations();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const today = startOfDay(new Date());

  const filterFn = useCallback(
    (m: MeetingListItem, q: string) =>
      matchesAny(
        [
          m.type,
          m.location,
          m.presidedBy,
          m.title,
          ...m.agendaTitles,
          t(`meetings.types.${m.type}` as "meetings.types.STATUTORY"),
        ],
        q
      ),
    [t]
  );

  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    meetings,
    filterFn,
    10
  );

  if (meetings.length === 0) return null;

  return (
    <div className="space-y-4">
      <ListToolbar query={query} onQueryChange={setQuery} />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {t("common.noResults")}
        </p>
      ) : (
        <div className="space-y-3">
          {pageSlice.items.map((meeting) => {
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

      <ListPagination
        page={page}
        totalPages={pageSlice.totalPages}
        total={pageSlice.total}
        start={pageSlice.start}
        end={pageSlice.end}
        onPageChange={setPage}
      />
    </div>
  );
}
