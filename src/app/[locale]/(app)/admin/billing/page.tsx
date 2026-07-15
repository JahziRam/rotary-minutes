import { getTranslations, setRequestLocale } from "next-intl/server";
import { adminQuery } from "@/lib/admin-safe";
import {
  getAdminBillingSummary,
  searchAdminBillingPayments,
} from "@/lib/queries/admin-billing";
import { parseListParams, listParamsToRecord } from "@/lib/server-list";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BillingReport } from "@/components/admin/billing-report";
import { getPlanLabelMap } from "@/lib/plans";

export default async function AdminBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const listParams = parseListParams({ q: sp.q, page: sp.page }, 20);

  const [summary, payments, planLabels] = await Promise.all([
    adminQuery("billingSummary", () => getAdminBillingSummary(), {
      totalRevenueCents: 0,
      monthRevenueCents: 0,
      paymentCount: 0,
      monthPaymentCount: 0,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      byPlan: [],
      byStatus: [],
      recentMonths: [],
    }),
    adminQuery(
      "billingPayments",
      () => searchAdminBillingPayments(listParams),
      {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        start: 0,
        end: 0,
      }
    ),
    adminQuery("planLabels", () => getPlanLabelMap(locale), {}),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("billing")} description={tPages("billing")} />
      <BillingReport
        summary={summary}
        payments={payments}
        initialQuery={sp.q ?? ""}
        listParams={listParamsToRecord(listParams)}
        planLabels={planLabels}
      />
    </div>
  );
}