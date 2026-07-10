import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Calendar } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { CalendarExport } from "@/components/meetings/calendar-export";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";
import { MeetingInvitationButton } from "@/components/meetings/meeting-invitation-button";
import { MeetingListActions } from "@/components/meetings/meeting-list-actions";

export default async function MeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scheduled?: string }>;
}) {
  const { locale } = await params;
  const { scheduled: scheduledId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tEmpty = await getTranslations("assistance.emptyStates.meetings");
  const ctx = await getClubContext();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const liveEnabled = ctx
    ? isFeatureEnabled(ctx.features, "liveMeetings", ctx.isSuperAdmin)
    : false;
  const today = startOfDay(new Date());

  const meetings = ctx
    ? await prisma.meeting.findMany({
        where: { clubId: ctx.clubId },
        include: {
          attendances: true,
          minute: {
            select: {
              id: true,
              agendaItems: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true },
              },
            },
          },
          club: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      })
    : [];

  const scheduledMeeting =
    scheduledId && ctx
      ? meetings.find((m) => m.id === scheduledId) ??
        (await prisma.meeting.findFirst({
          where: { id: scheduledId, clubId: ctx.clubId },
          include: {
            minute: {
              select: {
                agendaItems: {
                  orderBy: { sortOrder: "asc" },
                  select: { title: true },
                },
              },
            },
          },
        }))
      : null;

  return (
    <AppShellServer title={t("meetings.title")}>
      <div className="space-y-6">
        {scheduledMeeting && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900">
                {t("meetings.invitationBannerTitle")}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {t("meetings.invitationBannerHint")}
              </p>
              <p className="text-sm text-gray-800 mt-2">
                <span className="font-medium">
                  {t(`meetings.types.${scheduledMeeting.type}` as "meetings.types.STATUTORY")}
                </span>
                {" · "}
                {format(scheduledMeeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
                {scheduledMeeting.startTime ? ` · ${scheduledMeeting.startTime}` : ""}
                {scheduledMeeting.location ? ` · ${scheduledMeeting.location}` : ""}
              </p>
              {"minute" in scheduledMeeting &&
                scheduledMeeting.minute?.agendaItems &&
                scheduledMeeting.minute.agendaItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    <span className="font-medium text-gray-600">{t("meetings.agenda")}:</span>{" "}
                    {scheduledMeeting.minute.agendaItems
                      .slice(0, 4)
                      .map((item) => item.title)
                      .join(" · ")}
                  </p>
                )}
            </div>
            <MeetingInvitationButton meetingId={scheduledMeeting.id} size="sm" />
          </div>
        )}

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
            <GuidedEmptyState
              locale={locale}
              icon={Calendar}
              title={tEmpty("title")}
              description={tEmpty("description")}
              primaryLabel={tEmpty("primaryLabel")}
              primaryHref="/meetings/new"
              helpAnchor="meetings"
            />
          ) : (
            meetings.map((meeting) => {
              const rate = computeRecordedAttendanceRate(meeting.attendances);
              const isToday = isSameDay(meeting.date, today);
              const isUpcomingOrToday = startOfDay(meeting.date) >= today;
              const canStartLive = liveEnabled && !meeting.isLive && isUpcomingOrToday;
              const primaryHref =
                liveEnabled && meeting.isLive
                  ? `/${locale}/meetings/${meeting.id}/live`
                  : `/${locale}/meetings/${meeting.id}/attendance`;
              const agendaTitles = meeting.minute?.agendaItems.map((item) => item.title) ?? [];
              const agendaPreview = agendaTitles.slice(0, 3);
              const agendaMore = agendaTitles.length - agendaPreview.length;
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
                      <Link href={primaryHref} className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`h-14 w-14 rounded-xl text-white flex flex-col items-center justify-center shrink-0 ${
                            meeting.isLive ? "bg-green-700" : "bg-navy"
                          }`}
                        >
                          <Calendar className="h-5 w-5 mb-0.5 opacity-70" />
                          <span className="text-xs font-bold">
                            {format(meeting.date, "dd/MM", { locale: dateLocale })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {t(`meetings.types.${meeting.type}` as "meetings.types.STATUTORY")}
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
                        {rate !== null && <Badge variant="success">{rate}%</Badge>}
                        <CalendarExport
                          meeting={{
                            id: meeting.id,
                            title: meeting.title,
                            date: meeting.date,
                            location: meeting.location,
                            startTime: meeting.startTime,
                            endTime: meeting.endTime,
                            clubName: meeting.club.name,
                          }}
                          locale={locale}
                          compact
                        />
                      </div>
                    </div>

                    <MeetingListActions
                      meetingId={meeting.id}
                      minuteId={meeting.minute?.id}
                      locale={locale}
                      isLive={meeting.isLive}
                      canStartLive={canStartLive}
                      liveEnabled={liveEnabled}
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppShellServer>
  );
}
