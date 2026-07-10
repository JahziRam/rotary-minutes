import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Calendar } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { searchMeetingsPaginated } from "@/lib/queries/meetings-list";
import { parseListParams, listParamsToRecord } from "@/lib/server-list";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";
import { MeetingInvitationButton } from "@/components/meetings/meeting-invitation-button";
import { MeetingsList } from "@/components/meetings/meetings-list";

export default async function MeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scheduled?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tEmpty = await getTranslations("assistance.emptyStates.meetings");
  const ctx = await getClubContext();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const liveEnabled = ctx
    ? isFeatureEnabled(ctx.features, "liveMeetings", ctx.isSuperAdmin)
    : false;

  const listParams = parseListParams({ q: sp.q, page: sp.page }, 10);

  const [meetingsPage, totalMeetings, scheduledMeeting] = ctx
    ? await Promise.all([
        searchMeetingsPaginated(ctx.clubId, listParams),
        prisma.meeting.count({ where: { clubId: ctx.clubId } }),
        sp.scheduled
          ? prisma.meeting.findFirst({
              where: { id: sp.scheduled, clubId: ctx.clubId },
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
            })
          : Promise.resolve(null),
      ])
    : [{ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, start: 0, end: 0 }, 0, null];

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
              {scheduledMeeting.minute?.agendaItems &&
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
            {sp.q
              ? `${meetingsPage.total} ${t("common.results")}`
              : `${totalMeetings} ${t("meetings.title").toLowerCase()}`}
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

        {totalMeetings === 0 ? (
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
            meetings={meetingsPage}
            locale={locale}
            liveEnabled={liveEnabled}
            scheduledId={sp.scheduled}
            initialQuery={sp.q ?? ""}
            listParams={{
              ...listParamsToRecord(listParams),
              scheduled: sp.scheduled,
            }}
          />
        )}
      </div>
    </AppShellServer>
  );
}