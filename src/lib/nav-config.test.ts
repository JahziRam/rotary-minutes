import { describe, expect, it } from "vitest";
import { getMobileTabItems } from "./nav-config";

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