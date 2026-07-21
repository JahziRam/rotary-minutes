import { describe, expect, it } from "vitest";
import {
  detectCompletedOnboardingSteps,
  isOnboardingComplete,
  mergeOnboardingSteps,
  nextOnboardingStep,
} from "./onboarding-steps";

describe("onboarding steps", () => {
  it("detects completed steps from club signals", () => {
    expect(
      detectCompletedOnboardingSteps({
        hasClubProfile: true,
        hasMembers: true,
        hasMeeting: false,
        hasInvitedUsers: false,
        hasMinute: false,
      })
    ).toEqual(["CLUB_PROFILE", "MEMBERS"]);
  });

  it("merges stored and detected without duplicates", () => {
    expect(
      mergeOnboardingSteps(["CLUB_PROFILE"], ["CLUB_PROFILE", "MEMBERS"])
    ).toEqual(["CLUB_PROFILE", "MEMBERS"]);
  });

  it("picks the next incomplete step", () => {
    expect(nextOnboardingStep(["CLUB_PROFILE", "MEMBERS"])).toBe("FIRST_MEETING");
    expect(
      nextOnboardingStep([
        "CLUB_PROFILE",
        "MEMBERS",
        "FIRST_MEETING",
        "INVITE_USERS",
        "FIRST_MINUTE",
      ])
    ).toBe("COMPLETE");
  });

  it("detects full completion", () => {
    expect(isOnboardingComplete("COMPLETE", null, [])).toBe(true);
    expect(isOnboardingComplete("MEMBERS", new Date(), [])).toBe(true);
    expect(
      isOnboardingComplete("FIRST_MINUTE", null, [
        "CLUB_PROFILE",
        "MEMBERS",
        "FIRST_MEETING",
        "INVITE_USERS",
        "FIRST_MINUTE",
      ])
    ).toBe(true);
    expect(isOnboardingComplete("MEMBERS", null, ["CLUB_PROFILE"])).toBe(false);
  });
});
