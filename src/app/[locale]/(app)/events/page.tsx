import { getTranslations, setRequestLocale } from "next-intl/server";
import { listEvents } from "@/actions/events";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { EventsList } from "@/components/events/events-list";
import { getClubContext } from "@/lib/club-context";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const ctx = await getClubContext();

  const data = await listEvents();
  if ("error" in data) {
    if (data.error === "FEATURE_DISABLED" && ctx) {
      return (
        <AppShellServer title={t("title")}>
          <FeatureUnavailable
            feature="eventsEnabled"
            locale={locale}
            plan={ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{t("unauthorized")}</p>
      </AppShellServer>
    );
  }

  return (
    <AppShellServer title={t("title")}>
      <EventsList events={data.events} canManage={data.canManage} locale={locale} />
    </AppShellServer>
  );
}