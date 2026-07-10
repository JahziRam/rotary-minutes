import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Calendar } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";
import { MeetingInvitationButton } from "@/components/meetings/meeting-invitation-button";
import { MeetingsList } from "@/components/meetings/meetings-list";

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

  const listItems = meetings.map((meeting) => ({
    id: meeting.id,
    date: meeting.date.toISOString(),
    type: meeting.type,
    location: meeting.location,
    presidedBy: meeting.presidedBy,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    isLive: meeting.isLive,
    attendanceRate: computeRecordedAttendanceRate(meeting.attendances),
    agendaTitles: meeting.minute?.agendaItems.map((item) => item.title) ?? [],
    minuteId: meeting.minute?.id ?? null,
    clubName: meeting.club.name,
  }));

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
          <MeetingsList
            meetings={listItems}
            locale={locale}
            liveEnabled={liveEnabled}
            scheduledId={scheduledId}
          />
        )}
      </div>
    </AppShellServer>
  );
}
