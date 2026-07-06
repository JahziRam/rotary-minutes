import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getCalendarData } from "@/actions/calendar";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { UnifiedCalendar } from "@/components/calendar/unified-calendar";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "calendarEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const data = await getCalendarData(sp.month);
  if ("error" in data) return null;

  return (
    <AppShellServer title={t("title")}>
      <UnifiedCalendar
        events={data.events}
        month={data.month}
        prevMonth={data.prevMonth}
        nextMonth={data.nextMonth}
        canManage={data.canManage}
        locale={locale}
      />
    </AppShellServer>
  );
}