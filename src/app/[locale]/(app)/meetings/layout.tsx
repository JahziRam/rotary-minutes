import { setRequestLocale } from "next-intl/server";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MeetingsMinutesMaintenanceNotice } from "@/components/layout/meetings-minutes-maintenance-notice";
import { isMeetingsMinutesMaintenanceActive } from "@/lib/meetings-minutes-maintenance";

export default async function MeetingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isMeetingsMinutesMaintenanceActive()) {
    const title =
      locale === "en"
        ? "Meetings"
        : locale === "es"
          ? "Reuniones"
          : "Réunions";
    return (
      <AppShellServer title={title}>
        <div className="py-8">
          <MeetingsMinutesMaintenanceNotice locale={locale} />
        </div>
      </AppShellServer>
    );
  }

  return <>{children}</>;
}
