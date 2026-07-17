import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { listBudget } from "@/actions/treasury";
import { mandateRangeForYear } from "@/lib/budget-utils";
import { currentFiscalYear } from "@/lib/dues";
import {
  getTreasuryCategoriesAll,
  getTreasuryDashboardData,
  getTreasurySubAccounts,
} from "@/lib/queries/treasury";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { TreasuryPanel } from "@/components/treasury/treasury-panel";
import { TreasuryMandatePanel } from "@/components/treasury/treasury-mandate-panel";
import { BankReconciliationPanel } from "@/components/treasury/bank-reconciliation-panel";
import { hasRolePermission } from "@/lib/roles";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";
import { Wallet } from "lucide-react";
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
  const tEmpty = await getTranslations("assistance.emptyStates.treasury");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "treasuryEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const fiscalYear = sp.year ? parseInt(sp.year, 10) : currentFiscalYear();
  const range = mandateRangeForYear(fiscalYear);

  const [data, dashboard, allCategories, subAccounts] = await Promise.all([
    listBudget({
      eventId: sp.eventId,
      type: sp.type as BudgetEntryType | undefined,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }),
    getTreasuryDashboardData(ctx.clubId, locale, fiscalYear),
    getTreasuryCategoriesAll(ctx.clubId),
    getTreasurySubAccounts(ctx.clubId, true),
  ]);
  if ("error" in data) return null;

  const canManageTreasury = await hasRolePermission(
    ctx.role,
    "treasury.manage",
    ctx.isSuperAdmin
  );

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TreasuryMandatePanel
            clubId={ctx.clubId}
            currency={ctx.club.currency}
            locale={locale}
          />
        </div>
        <a
          href={`/${locale}/treasury/mandate-plan`}
          className="inline-flex text-sm font-medium text-navy hover:underline"
        >
          → Plan budgétaire du mandat (projets + événements + sous-comptes)
        </a>
        <BankReconciliationPanel canManage={canManageTreasury} />
      </div>
      {data.entries.length === 0 && (
        <GuidedEmptyState
          locale={locale}
          icon={Wallet}
          title={tEmpty("title")}
          description={tEmpty("description")}
          primaryLabel={tEmpty("primaryLabel")}
          primaryHref="/treasury"
          helpAnchor="dues"
        />
      )}
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
        subAccounts={subAccounts.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          description: s.description,
          isActive: s.isActive,
          sortOrder: s.sortOrder,
        }))}
        treasuryImportEnabled={isFeatureEnabled(ctx.features, "treasuryImportEnabled", ctx.isSuperAdmin)}
      />
    </AppShellServer>
  );
}