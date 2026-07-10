import { describe, it, expect } from "vitest";
import {
  ASSISTANCE_EVENT_TYPES,
  aggregateHintDismissals,
  aggregateStepAbandonment,
  computeGuideCompletionRate,
} from "./analytics";
import { getCoachTip } from "./coach";
import {
  getWalkthroughForMission,
  getWalkthroughSteps,
  parseWalkthroughState,
  CRITICAL_WALKTHROUGHS,
} from "./walkthroughs";
import { getMissionsForRole, MISSION_DEFINITIONS } from "./missions";

describe("assistance analytics", () => {
  it("computes guide completion rate", () => {
    expect(computeGuideCompletionRate(3, 10)).toBe(30);
    expect(computeGuideCompletionRate(0, 0)).toBe(0);
  });

  it("aggregates hint dismissals", () => {
    const result = aggregateHintDismissals([
      {
        eventType: ASSISTANCE_EVENT_TYPES.HINT_DISMISSED,
        payload: { hintId: "emails_intro" },
      },
      {
        eventType: ASSISTANCE_EVENT_TYPES.HINT_DISMISSED,
        payload: { hintId: "emails_intro" },
      },
    ]);
    expect(result.emails_intro).toBe(2);
  });

  it("aggregates step abandonment", () => {
    const result = aggregateStepAbandonment([
      {
        eventType: ASSISTANCE_EVENT_TYPES.GUIDE_STEP_ABANDON,
        payload: { step: "MEETINGS" },
      },
    ]);
    expect(result.MEETINGS).toBe(1);
  });
});

describe("coach", () => {
  it("prioritizes incomplete missions", () => {
    const started = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const tip = getCoachTip(started, {
      schedule_meeting: false,
      run_live_meeting: true,
    });
    expect(tip?.key).toBe("week1_meetings");
  });
});

describe("walkthroughs", () => {
  it("maps critical flows", () => {
    expect(CRITICAL_WALKTHROUGHS).toContain("create_meeting");
    expect(CRITICAL_WALKTHROUGHS).toContain("finalize_minute");
  });

  it("links missions to walkthroughs", () => {
    expect(getWalkthroughForMission("schedule_meeting")).toBe("create_meeting");
    expect(getWalkthroughSteps("create_meeting").length).toBeGreaterThan(0);
  });

  it("parses walkthrough state", () => {
    expect(parseWalkthroughState(null)).toEqual({});
    expect(
      parseWalkthroughState({ activeFlow: "create_meeting", stepIndex: 2 })
    ).toMatchObject({ activeFlow: "create_meeting", stepIndex: 2 });
  });
});

describe("missions", () => {
  it("includes extended modules for secretary", () => {
    const missions = getMissionsForRole("SECRETARY", []);
    const keys = missions.map((m) => m.key);
    expect(keys).toContain("send_email");
    expect(keys).toContain("explore_calendar");
    expect(keys).toContain("review_attendance");
  });

  it("hides missions when nav key hidden", () => {
    const missions = getMissionsForRole("SECRETARY", ["emails"]);
    expect(missions.some((m) => m.key === "send_email")).toBe(false);
  });

  it("defines all mission keys with href", () => {
    for (const m of MISSION_DEFINITIONS) {
      expect(m.href.startsWith("/")).toBe(true);
    }
  });
});