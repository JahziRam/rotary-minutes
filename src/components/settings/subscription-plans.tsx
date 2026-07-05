import { getActivePublicPlans } from "@/lib/plans";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { ensureAddonConfigs } from "@/lib/billing";
import { PlanSelector } from "./plan-selector";
import { SubscriptionPlansClient } from "./subscription-plans-client";
export async function SubscriptionPlans({
  locale,
  checkoutStatus,
}: {
  locale: string;
  checkoutStatus?: "success" | "cancel" | null;
}) {
  const [{ plans, billing }, ctx] = await Promise.all([
    getActivePublicPlans(locale),
    getClubContext(),
  ]);

  if (!ctx) {
    return (
      <PlanSelector
        plans={plans}
        billing={billing}
        locale={locale}
      />
    );
  }

  await ensureAddonConfigs();

  const [referrals, rewards, addonConfigs, clubAddons] = await Promise.all([
    prisma.referral.count({ where: { referrerClubId: ctx.clubId } }),
    prisma.referral.count({
      where: { referrerClubId: ctx.clubId, rewardApplied: true },
    }),
    prisma.addonConfig.findMany({ where: { isActive: true }, orderBy: { key: "asc" } }),
    prisma.clubAddon.findMany({ where: { clubId: ctx.clubId } }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralLink = `${baseUrl}/${locale}/register?ref=${ctx.club.slug}`;
  const isFr = locale === "fr";

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false));

  const activeAddonKeys = new Set(
    clubAddons
      .filter((a) => !a.expiresAt || a.expiresAt > new Date())
      .map((a) => a.addonKey)
  );

  const addons = addonConfigs.map((a) => ({
    key: a.key,
    name: isFr ? a.nameFr : a.nameEn,
    priceMonthly: a.priceMonthly,
    isActive: a.isActive,
    activated: activeAddonKeys.has(a.key),
  }));

  return (
    <SubscriptionPlansClient
      plans={plans}
      billing={billing}
      locale={locale}
      currentPlan={ctx.club.subscription?.plan}
      currentInterval={ctx.club.subscription?.billingInterval}
      referralCode={ctx.club.slug}
      referralLink={referralLink}
      referralsCount={referrals}
      rewardsEarned={rewards}
      addons={addons}
      canManage={canManage}
      stripeEnabled={billing.stripeEnabled}
      hasStripeCustomer={Boolean(ctx.club.subscription?.stripeCustomerId)}
      checkoutStatus={checkoutStatus}
    />
  );
}