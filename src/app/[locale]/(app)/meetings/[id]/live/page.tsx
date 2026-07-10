import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { getMinuteById } from "@/actions/minutes";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { requireFeature } from "@/lib/require-feature";
import { MinuteEditor } from "@/components/minutes/minute-editor";
import { UnifiedAttendanceSheet } from "@/components/meetings/unified-attendance-sheet";
import { LiveMeetingGuide } from "@/components/assistance/live-meeting-guide";
import { EndMeetingButton } from "@/components/meetings/end-meeting-button";

export default async function LiveMeetingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const gate = await requireFeature("liveMeetings", { includeMembers: true });
  if (gate.error === "UNAUTHORIZED") notFound();

  if (gate.error === "FEATURE_DISABLED") {
    return (
      <AppShellServer title={t("meetings.live")}>
        <FeatureUnavailable
          feature="liveMeetings"
          locale={locale}
          plan={gate.ctx.club.subscription?.plan}
        />
      </AppShellServer>
    );
  }

  const ctx = gate.ctx;
  const meeting = await prisma.meeting.findFirst({
    where: { id, clubId: ctx.clubId },
    include: { minute: true, attendances: true },
  });
  if (!meeting) notFound();

  const minute = meeting.minute
    ? await getMinuteById(meeting.minute.id)
    : null;

  const members = (ctx.club.members ?? []).map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
  }));

  const initialEntries = meeting.attendances.map((a) => ({
    memberId: a.memberId ?? undefined,
    guestName: a.guestName ?? undefined,
    category: a.category,
  }));

  return (
    <AppShellServer title={t("meetings.live")}>
      <div className="space-y-4">
        <LiveMeetingGuide hasMinute={!!minute} />
        {meeting.isLive && (
          <EndMeetingButton meetingId={meeting.id} variant="banner" />
        )}
        <div className="grid lg:grid-cols-2 gap-6">
          <div data-assist="live-attendance-panel">
            <UnifiedAttendanceSheet
              members={members}
              meetingId={meeting.id}
              minuteId={meeting.minute?.id}
              initialEntries={initialEntries}
            />
          </div>
          {minute ? (
            <div className="space-y-3" data-assist="live-minute-panel">
              <a
                href={`/${locale}/minutes/${minute.id}/edit`}
                className="text-sm text-navy hover:underline"
              >
                Mode édition →
              </a>
              <MinuteEditor
                clubId={ctx.clubId}
                minute={{
                  id: minute.id,
                  title: minute.title,
                  status: minute.status,
                  meeting: minute.meeting,
                  agendaItems: minute.agendaItems.map((item) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description ?? "",
                    decisions: item.decisions ?? "",
                    actions: item.actions ?? "",
                    responsible: item.responsible ?? "",
                    dueDate: item.dueDate
                      ? item.dueDate.toISOString().split("T")[0]
                      : "",
                    status: item.status,
                  })),
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </AppShellServer>
  );
}