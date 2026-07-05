import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { getLastMeetingDefaults } from "@/actions/meetings";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MeetingForm } from "@/components/meetings/meeting-form";

export default async function NewMeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  const { from } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext(true);

  const lastMeeting = ctx ? await getLastMeetingDefaults(ctx.clubId) : null;

  return (
    <AppShellServer title={t("meetings.new")}>
      {ctx ? (
        <MeetingForm
          clubDefaults={ctx.club}
          members={ctx.club.members ?? []}
          lastMeeting={lastMeeting}
          fromLast={from === "last"}
        />
      ) : (
        <p className="text-gray-500">Accès non autorisé</p>
      )}
    </AppShellServer>
  );
}