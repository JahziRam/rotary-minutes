import { describe, expect, it } from "vitest";
import {
  assertMinuteEditable,
  canOverrideMinuteLock,
  isMinuteContentLocked,
} from "./minute-lock";

describe("minute-lock", () => {
  it("locks content for REVIEW, FINALIZED and ARCHIVED only", () => {
    expect(isMinuteContentLocked("DRAFT")).toBe(false);
    expect(isMinuteContentLocked("IN_PROGRESS")).toBe(false);
    expect(isMinuteContentLocked("REVIEW")).toBe(true);
    expect(isMinuteContentLocked("FINALIZED")).toBe(true);
    expect(isMinuteContentLocked("ARCHIVED")).toBe(true);
  });

  it("allows president, club admin and super admin to override", () => {
    expect(canOverrideMinuteLock({ isSuperAdmin: true, role: "READER" })).toBe(true);
    expect(canOverrideMinuteLock({ isSuperAdmin: false, role: "PRESIDENT" })).toBe(true);
    expect(canOverrideMinuteLock({ isSuperAdmin: false, role: "ADMIN" })).toBe(true);
    expect(canOverrideMinuteLock({ isSuperAdmin: false, role: "SECRETARY" })).toBe(false);
    expect(canOverrideMinuteLock({ isSuperAdmin: false, role: "VICE_PRESIDENT" })).toBe(false);
  });

  it("assertMinuteEditable blocks non-override roles on locked statuses", () => {
    expect(
      assertMinuteEditable("FINALIZED", { isSuperAdmin: false, role: "SECRETARY" })
    ).toEqual({ error: "LOCKED" });
    expect(
      assertMinuteEditable("ARCHIVED", { isSuperAdmin: false, role: "ADMIN" })
    ).toBeNull();
    expect(
      assertMinuteEditable("FINALIZED", { isSuperAdmin: false, role: "PRESIDENT" })
    ).toBeNull();
    expect(
      assertMinuteEditable("ARCHIVED", { isSuperAdmin: true, role: "READER" })
    ).toBeNull();
    expect(
      assertMinuteEditable("DRAFT", { isSuperAdmin: false, role: "SECRETARY" })
    ).toBeNull();
  });
});

