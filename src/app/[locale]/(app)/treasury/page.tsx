import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { listBudget } from "@/actions/treasury";
import { mandateRangeForYear } from "@/lib/budget-utils";
import { currentFiscalYear } from "@/lib/dues";
import { getTreasuryCategoriesAll, getTreasuryDashboardData } from "@/lib/queries/treasury";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { TreasuryPanel } from "@/components/treasury/treasury-panel";
import type { BudgetEntryType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function TreasuryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ eventId?: string; type?: string; year?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("treasury");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "treasuryEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const fiscalYear = sp.year ? parseInt(sp.year, 10) : currentFiscalYear();
  const range = mandateRangeForYear(fiscalYear);

  const [data, dashboard, allCategories] = await Promise.all([
    listBudget({
      eventId: sp.eventId,
      type: sp.type as BudgetEntryType | undefined,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }),
    getTreasuryDashboardData(ctx.clubId, locale, fiscalYear),
    getTreasuryCategoriesAll(ctx.clubId),
  ]);
  if ("error" in data) return null;

  return (
    <AppShellServer title={t("title")}>
      <TreasuryPanel
        entries={data.entries}
        categories={data.categories}
        events={data.events}
        summary={data.summary}
        currency={data.currency}
        canManage={data.canManage}
        locale={locale}
        initialEventId={sp.eventId}
        fiscalYear={fiscalYear}
        dashboard={dashboard}
        allCategories={allCategories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isActive: c.isActive,
        }))}
      />
    </AppShellServer>
  );
}