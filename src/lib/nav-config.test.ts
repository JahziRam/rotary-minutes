import { describe, expect, it } from "vitest";
import {
  CLUB_NAV_ITEMS,
  getMobileTabItems,
  getVisibleNavGroups,
  isNavItemActive,
} from "./nav-config";

describe("getMobileTabItems", () => {
  it("returns my-account tab for readers without members tab", () => {
    const tabs = getMobileTabItems(["members"]);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain("myAccount");
    expect(keys).not.toContain("members");
    expect(keys.length).toBeLessThanOrEqual(4);
  });

  it("keeps default tabs for admins", () => {
    const tabs = getMobileTabItems([]);
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain("members");
    expect(keys).toContain("dashboard");
  });
});

describe("getVisibleNavGroups", () => {
  it("hides empty groups and district when disabled", () => {
    const groups = getVisibleNavGroups(["emails", "documents", "district"], {
      showDistrictNav: false,
    });
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("clubLife");
    expect(ids).toContain("work");
    const tools = groups.find((g) => g.id === "tools");
    expect(tools).toBeUndefined();
  });

  it("flattens to unique nav keys", () => {
    const keys = CLUB_NAV_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("myWork");
    expect(keys).toContain("treasuryPlan");
    expect(keys).toContain("commissions");
  });
});

describe("isNavItemActive", () => {
  it("does not mark members active on commissions route", () => {
    expect(isNavItemActive("/fr/members/commissions", "fr", "/members")).toBe(
      false
    );
    expect(
      isNavItemActive("/fr/members/commissions", "fr", "/members/commissions")
    ).toBe(true);
  });

  it("does not mark treasury active on mandate-plan", () => {
    expect(
      isNavItemActive("/fr/treasury/mandate-plan", "fr", "/treasury")
    ).toBe(false);
    expect(
      isNavItemActive("/fr/treasury/mandate-plan", "fr", "/treasury/mandate-plan")
    ).toBe(true);
  });
});
