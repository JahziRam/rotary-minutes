import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MobileAttendanceSheet } from "@/components/meetings/mobile-attendance-sheet";
import { AttendanceQrPanel } from "@/components/meetings/attendance-qr-panel";

export default async function MeetingAttendancePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("attendance");
  const ctx = await getClubContext();
  if (!ctx) notFound();

  const meeting = await prisma.meeting.findFirst({
    where: { id, clubId: ctx.clubId },
    include: { attendances: true },
  });
  if (!meeting) notFound();

  const members = await prisma.member.findMany({
    where: { clubId: ctx.clubId, isActive: true },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  const initialEntries = meeting.attendances.map((a) => ({
    memberId: a.memberId ?? undefined,
    guestName: a.guestName ?? undefined,
    category: a.category,
  }));

  const dateLocale = locale === "fr" ? fr : enUS;

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Link href={`/${locale}/meetings`} className="text-sm text-navy hover:underline">
              ← {locale === "fr" ? "Réunions" : "Meetings"}
            </Link>
            <p className="font-semibold text-gray-900 mt-1">
              {format(meeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
            </p>
            {meeting.location && (
              <p className="text-sm text-gray-500">{meeting.location}</p>
            )}
          </div>
          <AttendanceQrPanel meetingId={meeting.id} />
        </div>
        <MobileAttendanceSheet
          members={members}
          meetingId={meeting.id}
          initialEntries={initialEntries}
        />
      </div>
    </AppShellServer>
  );
}