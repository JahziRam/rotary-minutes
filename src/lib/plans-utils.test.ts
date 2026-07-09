import { describe, expect, it } from "vitest";
import {
  computeAnnualPerMonth,
  computeAnnualPrice,
  formatPrice,
  getStripePriceId,
  toPublicPlan,
  type PlanConfigData,
} from "./plans-utils";

const basePlan: PlanConfigData = {
  plan: "PROFESSIONAL",
  nameFr: "Active",
  nameEn: "Active",
  descriptionFr: "Desc FR",
  descriptionEn: "Desc EN",
  priceMonthly: 39,
  featuresFr: ["PV", "Trésorerie"],
  featuresEn: ["Minutes", "Treasury"],
  stripePriceIdMonthly: "price_monthly",
  stripePriceIdAnnual: "price_annual",
  memberLimit: 50,
  isActive: true,
  isPopular: true,
  sortOrder: 1,
};

describe("computeAnnualPrice", () => {
  it("applies discount to yearly total", () => {
    expect(computeAnnualPrice(39, 20)).toBe(374);
    expect(computeAnnualPrice(10, 0)).toBe(120);
  });
});

describe("computeAnnualPerMonth", () => {
  it("derives monthly equivalent from discounted annual", () => {
    expect(computeAnnualPerMonth(39, 20)).toBe(31.17);
  });
});

describe("toPublicPlan", () => {
  it("localizes fields for French", () => {
    const plan = toPublicPlan(basePlan, "fr", 20);
    expect(plan.name).toBe("Active");
    expect(plan.features).toEqual(["PV", "Trésorerie"]);
    expect(plan.priceAnnual).toBe(374);
    expect(plan.annualSavings).toBe(94);
  });

  it("localizes fields for English", () => {
    const plan = toPublicPlan(basePlan, "en", 20);
    expect(plan.name).toBe("Active");
    expect(plan.features).toEqual(["Minutes", "Treasury"]);
  });
});

describe("formatPrice", () => {
  it("formats EUR for French locale", () => {
    expect(formatPrice(39, "EUR", "fr")).toMatch(/39/);
  });
});

describe("getStripePriceId", () => {
  it("returns monthly or annual Stripe price id", () => {
    const publicPlan = toPublicPlan(basePlan, "en", 20);
    expect(getStripePriceId(publicPlan, "MONTHLY")).toBe("price_monthly");
    expect(getStripePriceId(publicPlan, "ANNUAL")).toBe("price_annual");
  });
});