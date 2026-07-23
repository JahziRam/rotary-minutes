import { describe, expect, it } from "vitest";
import {
  assertMeetingsMinutesAvailable,
  isMeetingsMinutesMaintenanceActive,
  MEETINGS_MINUTES_MAINTENANCE_UNTIL,
} from "./meetings-minutes-maintenance";

describe("meetings-minutes maintenance window", () => {
  it("is active before 2026-07-27 12:00 GMT+3", () => {
    expect(
      isMeetingsMinutesMaintenanceActive(new Date("2026-07-27T08:59:59.000Z"))
    ).toBe(true);
  });

  it("ends at 2026-07-27 12:00 GMT+3 (09:00 UTC)", () => {
    expect(MEETINGS_MINUTES_MAINTENANCE_UNTIL.toISOString()).toBe(
      "2026-07-27T09:00:00.000Z"
    );
    expect(
      isMeetingsMinutesMaintenanceActive(new Date("2026-07-27T09:00:00.000Z"))
    ).toBe(false);
    expect(
      isMeetingsMinutesMaintenanceActive(new Date("2026-07-27T09:00:01.000Z"))
    ).toBe(false);
  });

  it("assertMeetingsMinutesAvailable matches the window", () => {
    // Live check: while the window is open, server actions must refuse.
    if (isMeetingsMinutesMaintenanceActive()) {
      expect(assertMeetingsMinutesAvailable()).toEqual({ error: "MAINTENANCE" });
    } else {
      expect(assertMeetingsMinutesAvailable()).toBeNull();
    }
  });
});
