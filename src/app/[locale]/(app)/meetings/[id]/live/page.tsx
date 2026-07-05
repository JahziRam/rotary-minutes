import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { getMinuteById } from "@/actions/minutes";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { requireFeature } from "@/lib/require-feature";
import { MinuteEditor } from "@/components/minutes/minute-editor";
import { AttendancePanel } from "@/components/meetings/attendance-panel";

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

  const initialSelected = Object.fromEntries(
    meeting.attendances.map((a) => [a.memberId, a.category])
  );

  return (
    <AppShellServer title={t("meetings.live")}>
      <div className="grid lg:grid-cols-2 gap-6">
        <AttendancePanel
          members={ctx.club.members ?? []}
          meetingId={meeting.id}
          initialSelected={initialSelected}
        />
        {minute ? (
          <div className="space-y-3">
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
                dueDate: item.dueDate ? item.dueDate.toISOString().split("T")[0] : "",
                status: item.status,
              })),
            }}
          />
          </div>
        ) : (
          <p className="text-gray-500">Aucun PV associé</p>
        )}
      </div>
    </AppShellServer>
  );
}