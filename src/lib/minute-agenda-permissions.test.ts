import { describe, expect, it } from "vitest";
import { canDeleteMinuteAgendaItems } from "./minute-agenda-permissions";

describe("canDeleteMinuteAgendaItems", () => {
  it("allows president, secretary, club admin and super admin", () => {
    expect(canDeleteMinuteAgendaItems({ isSuperAdmin: true, role: "READER" })).toBe(
      true
    );
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "PRESIDENT" })
    ).toBe(true);
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "SECRETARY" })
    ).toBe(true);
    expect(canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "ADMIN" })).toBe(
      true
    );
  });

  it("denies other club roles", () => {
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "VICE_PRESIDENT" })
    ).toBe(false);
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "PROTOCOL" })
    ).toBe(false);
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "READER" })
    ).toBe(false);
    expect(
      canDeleteMinuteAgendaItems({ isSuperAdmin: false, role: "TREASURER" })
    ).toBe(false);
  });
});
