"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import {
  parseWalkthroughState,
  type WalkthroughFlowId,
  type WalkthroughState,
} from "@/lib/assistance/walkthroughs";
import { ASSISTANCE_EVENT_TYPES } from "@/lib/assistance/analytics";
import { trackAssistanceEvent } from "@/actions/assistance-analytics";

async function updateWalkthroughState(next: WalkthroughState) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  await prisma.clubMembership.update({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    data: { walkthroughState: next },
  });

  return { success: true as const };
}

export async function getWalkthroughState(): Promise<WalkthroughState> {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return {};

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    select: { walkthroughState: true },
  });

  return parseWalkthroughState(membership?.walkthroughState);
}

export async function startWalkthrough(flowId: WalkthroughFlowId) {
  const result = await updateWalkthroughState({
    activeFlow: flowId,
    stepIndex: 0,
  });
  if ("error" in result) return result;

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_STARTED, { flowId });
  return { success: true as const };
}

export async function advanceWalkthroughStep(flowId: WalkthroughFlowId, stepIndex: number) {
  const current = await getWalkthroughState();
  const result = await updateWalkthroughState({
    ...current,
    activeFlow: flowId,
    stepIndex,
  });
  if ("error" in result) return result;

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_STEP, {
    flowId,
    stepIndex,
  });
  return { success: true as const };
}

export async function completeWalkthrough(flowId: WalkthroughFlowId) {
  const current = await getWalkthroughState();
  const completedFlows = [...new Set([...(current.completedFlows ?? []), flowId])];

  const result = await updateWalkthroughState({
    activeFlow: undefined,
    stepIndex: 0,
    completedFlows,
  });
  if ("error" in result) return result;

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_COMPLETED, { flowId });

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}`, "layout");
  }

  return { success: true as const };
}

export async function abandonWalkthrough(flowId: WalkthroughFlowId, stepIndex: number) {
  const current = await getWalkthroughState();
  const result = await updateWalkthroughState({
    ...current,
    activeFlow: undefined,
    stepIndex: 0,
  });
  if ("error" in result) return result;

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_ABANDONED, {
    flowId,
    stepIndex,
  });
  return { success: true as const };
}

export async function trackMissionStarted(missionKey: string) {
  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.MISSION_STARTED, { missionKey });
  return { success: true as const };
}