import type { OnboardingStepKey } from "@/generated/prisma/client";

/** Club setup steps (COMPLETE is terminal, not a wizard card). */
export const ONBOARDING_WIZARD_STEPS: OnboardingStepKey[] = [
  "CLUB_PROFILE",
  "MEMBERS",
  "FIRST_MEETING",
  "INVITE_USERS",
  "FIRST_MINUTE",
];

export type OnboardingProgressSignals = {
  hasClubProfile: boolean;
  hasMembers: boolean;
  hasMeeting: boolean;
  hasInvitedUsers: boolean;
  hasMinute: boolean;
};

/** Derive which wizard steps are already satisfied by real club data. */
export function detectCompletedOnboardingSteps(
  signals: OnboardingProgressSignals
): OnboardingStepKey[] {
  const done: OnboardingStepKey[] = [];
  if (signals.hasClubProfile) done.push("CLUB_PROFILE");
  if (signals.hasMembers) done.push("MEMBERS");
  if (signals.hasMeeting) done.push("FIRST_MEETING");
  if (signals.hasInvitedUsers) done.push("INVITE_USERS");
  if (signals.hasMinute) done.push("FIRST_MINUTE");
  return done;
}

/** Merge stored steps with auto-detected progress (never remove stored completions). */
export function mergeOnboardingSteps(
  stored: OnboardingStepKey[],
  detected: OnboardingStepKey[]
): OnboardingStepKey[] {
  return [...new Set([...stored, ...detected])].filter(
    (s) => s !== "COMPLETE"
  ) as OnboardingStepKey[];
}

export function nextOnboardingStep(
  completed: OnboardingStepKey[]
): OnboardingStepKey {
  for (const step of ONBOARDING_WIZARD_STEPS) {
    if (!completed.includes(step)) return step;
  }
  return "COMPLETE";
}

export function isOnboardingComplete(
  currentStep: OnboardingStepKey | null | undefined,
  completedAt: Date | null | undefined,
  completedSteps: OnboardingStepKey[] = []
): boolean {
  if (completedAt) return true;
  if (currentStep === "COMPLETE") return true;
  return ONBOARDING_WIZARD_STEPS.every((s) => completedSteps.includes(s));
}
