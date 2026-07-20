import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { attendanceEligibleMemberWhere } from "@/lib/member-attendance-eligibility";
import { getClubContext } from "@/lib/club-context";
import {
  canOverrideMinuteLock,
  isMinuteContentLocked,
} from "@/lib/minute-lock";
import { hasRolePermission } from "@/lib/roles";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { UnifiedAttendanceSheet } from "@/components/meetings/unified-attendance-sheet";
import { AttendanceQrPanel } from "@/components/meetings/attendance-qr-panel";
import { CalendarExport } from "@/components/meetings/calendar-export";
import { MeetingDetailsEditor } from "@/components/meetings/meeting-details-editor";

export default async function MeetingAttendancePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("attendance");
  const tMeetings = await getTranslations("meetings");
  const ctx = await getClubContext();
  if (!ctx) notFound();

  const meeting = await prisma.meeting.findFirst({
    where: { id, clubId: ctx.clubId },
    include: {
      attendances: true,
      club: { select: { name: true } },
      minute: { select: { id: true, status: true } },
    },
  });
  if (!meeting) notFound();

  const [members, officerMembers] = await Promise.all([
    prisma.member.findMany({
      where: attendanceEligibleMemberWhere(ctx.clubId),
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.member.findMany({
      where: { clubId: ctx.clubId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const initialEntries = meeting.attendances.map((a) => ({
    memberId: a.memberId ?? undefined,
    guestName: a.guestName ?? undefined,
    category: a.category,
  }));

  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const canEditMeetings = await hasRolePermission(
    ctx.role,
    "meetings.edit",
    ctx.isSuperAdmin,
    ctx.customRoleId
  );
  const minuteLocked =
    !!meeting.minute && isMinuteContentLocked(meeting.minute.status);
  const canEditDetails =
    canEditMeetings &&
    (!minuteLocked || canOverrideMinuteLock(ctx));

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Link href={`/${locale}/meetings`} className="text-sm text-navy hover:underline">
              ← {tMeetings("title")}
            </Link>
            <p className="font-semibold text-gray-900 mt-1">
              {format(meeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
            </p>
            {meeting.location && (
              <p className="text-sm text-gray-500">{meeting.location}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
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
            />
            <AttendanceQrPanel meetingId={meeting.id} />
          </div>
        </div>

        <MeetingDetailsEditor
          meetingId={meeting.id}
          members={officerMembers}
          canEdit={canEditDetails}
          lockedHint={minuteLocked && canOverrideMinuteLock(ctx)}
          initial={{
            title: meeting.title,
            date: meeting.date,
            location: meeting.location,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            presidedBy: meeting.presidedBy,
            secretary: meeting.secretary,
          }}
        />

        <UnifiedAttendanceSheet
          members={members}
          meetingId={meeting.id}
          minuteId={meeting.minute?.id}
          initialEntries={initialEntries}
        />
      </div>
    </AppShellServer>
  );
}
