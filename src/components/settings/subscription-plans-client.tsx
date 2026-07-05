"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PlanSelector } from "./plan-selector";
import { ReferralPanel } from "@/components/subscription/referral-panel";
import { Button } from "@/components/ui/button";
import { activateAddon } from "@/actions/billing";
import { openBillingPortal } from "@/actions/subscription";
import { formatPrice, type BillingSettings, type PublicPlan } from "@/lib/plans-utils";
import type { AddonKey, BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type AddonView = {
  key: AddonKey;
  name: string;
  priceMonthly: number;
  isActive: boolean;
  activated: boolean;
};

export function SubscriptionPlansClient({
  plans,
  billing,
  locale,
  currentPlan,
  currentInterval,
  referralCode,
  referralLink,
  referralsCount,
  rewardsEarned,
  addons,
  canManage,
  stripeEnabled = false,
  hasStripeCustomer = false,
  checkoutStatus = null,
}: {
  plans: PublicPlan[];
  billing: BillingSettings;
  locale: string;
  currentPlan?: SubscriptionPlan;
  currentInterval?: BillingInterval;
  referralCode: string;
  referralLink: string;
  referralsCount: number;
  rewardsEarned: number;
  addons: AddonView[];
  canManage: boolean;
  stripeEnabled?: boolean;
  hasStripeCustomer?: boolean;
  checkoutStatus?: "success" | "cancel" | null;
}) {
  const t = useTranslations("subscription");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleOpenPortal() {
    startTransition(async () => {
      const result = await openBillingPortal(locale);
      if ("portalUrl" in result && result.portalUrl) {
        window.location.href = result.portalUrl;
      }
    });
  }

  function handleActivateAddon(key: AddonKey) {
    startTransition(async () => {
      await activateAddon(key, locale);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {checkoutStatus === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("stripe.checkoutSuccess")}
        </div>
      )}
      {checkoutStatus === "cancel" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("stripe.checkoutCancel")}
        </div>
      )}

      {canManage && stripeEnabled && hasStripeCustomer && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleOpenPortal}
          >
            {t("stripe.manageBilling")}
          </Button>
        </div>
      )}

      <PlanSelector
        plans={plans}
        billing={billing}
        locale={locale}
        currentPlan={currentPlan}
        currentInterval={currentInterval}
      />

      {canManage && (
        <ReferralPanel
          referralCode={referralCode}
          referralLink={referralLink}
          referralsCount={referralsCount}
          rewardsEarned={rewardsEarned}
        />
      )}

      {addons.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">{t("addons.title")}</h3>
          <p className="text-sm text-gray-500">{t("addons.description")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map((addon) => (
              <div
                key={addon.key}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-3",
                  addon.activated ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"
                )}
              >
                <div>
                  <p className="font-medium text-gray-900">{addon.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatPrice(addon.priceMonthly, billing.currency, locale)}/{t("perMonth")}
                  </p>
                </div>
                {addon.activated ? (
                  <span className="text-xs font-medium text-emerald-700">{t("addons.active")}</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canManage || !addon.isActive || pending}
                    onClick={() => handleActivateAddon(addon.key)}
                  >
                    {t("addons.activate")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}