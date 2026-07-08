import type { PlanConfigData } from "@/lib/plans-utils";

/** True when Stripe IDs are set — price changes won't auto-sync to Stripe. */
export function planHasStripePriceIds(plan: Pick<
  PlanConfigData,
  "stripePriceIdMonthly" | "stripePriceIdAnnual"
>): boolean {
  return Boolean(plan.stripePriceIdMonthly?.trim() || plan.stripePriceIdAnnual?.trim());
}

export function shouldWarnStripePriceChange(opts: {
  stripeEnabled: boolean;
  previousPriceMonthly: number;
  nextPriceMonthly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}): boolean {
  if (!opts.stripeEnabled) return false;
  if (opts.previousPriceMonthly === opts.nextPriceMonthly) return false;
  return Boolean(opts.stripePriceIdMonthly?.trim() || opts.stripePriceIdAnnual?.trim());
}