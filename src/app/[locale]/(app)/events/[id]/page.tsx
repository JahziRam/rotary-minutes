import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getEventBudget, getEventDetail } from "@/actions/events";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { EventDetailPanel } from "@/components/events/event-detail-panel";
import { EventBudgetPanel } from "@/components/events/event-budget-panel";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");

  const [data, budgetData] = await Promise.all([
    getEventDetail(id),
    getEventBudget(id),
  ]);
  if ("error" in data) {
    if (data.error === "NOT_FOUND") notFound();
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{t("unauthorized")}</p>
      </AppShellServer>
    );
  }

  return (
    <AppShellServer title={data.event.title}>
      <div className="space-y-6">
        <EventDetailPanel
          event={data.event}
          registrations={data.registrations}
          canManage={data.canManage}
          eventsAdvanced={data.eventsAdvanced}
          myMemberId={data.myMemberId}
          myRegistration={data.myRegistration}
          locale={locale}
        />
        {!("error" in budgetData) && (
          <EventBudgetPanel
            eventId={id}
            currency={budgetData.currency ?? data.event.currency ?? "EUR"}
            locale={locale}
            canManage={budgetData.canManage}
            budget={budgetData.budget}
            budgetNotes={budgetData.budgetNotes}
            entries={budgetData.budgetEntries}
            documents={budgetData.budgetDocuments}
          />
        )}
      </div>
    </AppShellServer>
  );
}