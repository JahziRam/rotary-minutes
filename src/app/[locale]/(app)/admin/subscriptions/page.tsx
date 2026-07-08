import { setRequestLocale } from "next-intl/server";
import { getSubscriptionBreakdown } from "@/lib/queries/admin";
import { prisma } from "@/lib/prisma";
import { adminQuery } from "@/lib/admin-safe";
import { getAllPlanConfigs, getBillingSettings } from "@/lib/plans";
import { ensureAddonConfigs } from "@/lib/billing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionBreakdown } from "@/components/admin/subscription-breakdown";
import { PlansEditor } from "@/components/admin/plans-editor";
import { PromoCodesEditor } from "@/components/admin/promo-codes-editor";
import { AddonsEditor } from "@/components/admin/addons-editor";
import { CreditCard, Tag, Puzzle } from "lucide-react";

export default async function AdminSubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await adminQuery("ensureAddonConfigs", () => ensureAddonConfigs(), undefined);

  const [breakdown, subscriptions, plans, billing, promos, addons, clubAddons] =
    await Promise.all([
      adminQuery("subscriptionBreakdown", () => getSubscriptionBreakdown(), {
        byPlan: [],
        byStatus: [],
      }),
      adminQuery(
        "subscriptions",
        () =>
          prisma.subscription.findMany({
            include: { club: { select: { name: true, city: true } } },
            orderBy: { updatedAt: "desc" },
          }),
        []
      ),
      adminQuery("planConfigs", () => getAllPlanConfigs(), []),
      adminQuery("billingSettings", () => getBillingSettings(), {
        annualDiscountPercent: 20,
        currency: "EUR",
        stripeEnabled: false,
      }),
      adminQuery(
        "promoCodes",
        () => prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
        []
      ),
      adminQuery(
        "addonConfigs",
        () => prisma.addonConfig.findMany({ orderBy: { key: "asc" } }),
        []
      ),
      adminQuery(
        "clubAddons",
        () =>
          prisma.clubAddon.findMany({
            include: { club: { select: { id: true, name: true, city: true } } },
            orderBy: { activatedAt: "desc" },
          }),
        []
      ),
    ]);

  return (
    <div className="space-y-6">
      <SubscriptionBreakdown data={breakdown} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-navy" />
            Configuration des offres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlansEditor
            plans={plans}
            annualDiscountPercent={billing.annualDiscountPercent}
            currency={billing.currency}
            stripeEnabled={billing.stripeEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-navy" />
            Codes promo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodesEditor promos={promos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-navy" />
            Addons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddonsEditor addons={addons} clubAddons={clubAddons} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Abonnements par club</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Club</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Facturation</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Aucun abonnement enregistré.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2">{s.club?.name ?? "—"} · {s.club?.city ?? ""}</td>
                      <td className="px-4 py-2">{s.plan}</td>
                      <td className="px-4 py-2">
                        {s.billingInterval === "ANNUAL" ? "Annuel" : "Mensuel"}
                      </td>
                      <td className="px-4 py-2">{s.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}