import { describe, expect, it } from "vitest";
import { planHasStripePriceIds, shouldWarnStripePriceChange } from "./plans-stripe";

describe("planHasStripePriceIds", () => {
  it("detects configured Stripe price ids", () => {
    expect(
      planHasStripePriceIds({
        stripePriceIdMonthly: "price_m",
        stripePriceIdAnnual: null,
      })
    ).toBe(true);
    expect(
      planHasStripePriceIds({
        stripePriceIdMonthly: "",
        stripePriceIdAnnual: "",
      })
    ).toBe(false);
  });
});

describe("shouldWarnStripePriceChange", () => {
  it("warns when Stripe is enabled, price changed, and ids exist", () => {
    expect(
      shouldWarnStripePriceChange({
        stripeEnabled: true,
        previousPriceMonthly: 39,
        nextPriceMonthly: 49,
        stripePriceIdMonthly: "price_m",
        stripePriceIdAnnual: null,
      })
    ).toBe(true);
  });

  it("does not warn when Stripe is disabled", () => {
    expect(
      shouldWarnStripePriceChange({
        stripeEnabled: false,
        previousPriceMonthly: 39,
        nextPriceMonthly: 49,
        stripePriceIdMonthly: "price_m",
        stripePriceIdAnnual: null,
      })
    ).toBe(false);
  });

  it("does not warn when price is unchanged", () => {
    expect(
      shouldWarnStripePriceChange({
        stripeEnabled: true,
        previousPriceMonthly: 39,
        nextPriceMonthly: 39,
        stripePriceIdMonthly: "price_m",
        stripePriceIdAnnual: null,
      })
    ).toBe(false);
  });

  it("does not warn when no Stripe price ids are set", () => {
    expect(
      shouldWarnStripePriceChange({
        stripeEnabled: true,
        previousPriceMonthly: 39,
        nextPriceMonthly: 49,
        stripePriceIdMonthly: null,
        stripePriceIdAnnual: null,
      })
    ).toBe(false);
  });
});