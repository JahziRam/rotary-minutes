"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { getHiddenNavKeys } from "@/lib/nav-access";
import { getVisibleUsageGuideSteps } from "@/lib/usage-guide-steps";
import { ASSISTANCE_EVENT_TYPES } from "@/lib/assistance/analytics";
import { trackAssistanceEvent } from "@/actions/assistance-analytics";

export type UsageGuideContext = {
  shouldShow: boolean;
  completed: boolean;
  dismissed: boolean;
  clubSetupComplete: boolean;
  guideEnabled: boolean;
  hiddenNavKeys: string[];
};

export async function getUsageGuideContext(): Promise<UsageGuideContext | null> {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return null;

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    select: {
      usageGuideCompletedAt: true,
      usageGuideDismissedAt: true,
    },
  });

  const onboarding = await prisma.clubOnboarding.findUnique({
    where: { clubId: ctx.clubId },
    select: { currentStep: true, completedAt: true },
  });

  const clubSetupComplete =
    onboarding?.currentStep === "COMPLETE" || onboarding?.completedAt != null;

  const hiddenNavKeys = getHiddenNavKeys(ctx.role, ctx.features, false);
  const guideEnabled = ctx.club.guideEnabled;
  const completed = membership?.usageGuideCompletedAt != null;
  const dismissed = membership?.usageGuideDismissedAt != null;

  const shouldShow = guideEnabled && clubSetupComplete && !completed && !dismissed;

  return {
    shouldShow,
    completed,
    dismissed,
    clubSetupComplete,
    guideEnabled,
    hiddenNavKeys,
  };
}

async function updateMembershipGuide(
  data: {
    usageGuideCompletedAt?: Date | null;
    usageGuideDismissedAt?: Date | null;
    usageGuideStartedAt?: Date | null;
    usageGuideLastStep?: string | null;
  }
) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  await prisma.clubMembership.update({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    data,
  });

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}`, "layout");
  }

  return { success: true as const };
}

export async function completeUsageGuide() {
  const result = await updateMembershipGuide({
    usageGuideCompletedAt: new Date(),
    usageGuideDismissedAt: null,
  });
  if ("success" in result && result.success) {
    await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.GUIDE_COMPLETED);
  }
  return result;
}

export async function dismissUsageGuide(lastStep?: string) {
  const result = await updateMembershipGuide({
    usageGuideDismissedAt: new Date(),
    usageGuideLastStep: lastStep ?? null,
  });
  if ("success" in result && result.success) {
    await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.GUIDE_DISMISSED, {
      lastStep,
    });
    if (lastStep) {
      await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.GUIDE_STEP_ABANDON, {
        step: lastStep,
      });
    }
  }
  return result;
}

export async function startUsageGuide() {
  const result = await updateMembershipGuide({
    usageGuideStartedAt: new Date(),
  });
  if ("success" in result && result.success) {
    await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.GUIDE_STARTED);
  }
  return result;
}

export async function trackUsageGuideStep(step: string) {
  await updateMembershipGuide({ usageGuideLastStep: step });
  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.GUIDE_STEP_VIEW, { step });
  return { success: true as const };
}

export async function resetUsageGuide() {
  return updateMembershipGuide({
    usageGuideCompletedAt: null,
    usageGuideDismissedAt: null,
  });
}

export async function getUsageGuideStepCount(hiddenNavKeys: string[]) {
  return getVisibleUsageGuideSteps(hiddenNavKeys).length;
}