"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { auth } from "@/lib/auth";
import {
  ASSISTANCE_EVENT_TYPES,
  type AssistanceEventType,
  type AssistanceAnalyticsSummary,
  aggregateHintDismissals,
  aggregateStepAbandonment,
  computeGuideCompletionRate,
} from "@/lib/assistance/analytics";

export async function trackAssistanceEvent(
  eventType: AssistanceEventType,
  payload?: Record<string, unknown>
) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { ok: false as const };

  try {
    await prisma.assistanceAnalyticsEvent.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        eventType,
        payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function getAssistanceAnalyticsSummary(
  days = 30
): Promise<AssistanceAnalyticsSummary | null> {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [events, feedbackAgg] = await Promise.all([
    prisma.assistanceAnalyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { eventType: true, payload: true },
    }),
    prisma.assistanceFeedback.aggregate({
      where: { createdAt: { gte: since } },
      _count: true,
      _avg: { rating: true },
    }),
  ]);

  const count = (type: string) => events.filter((e) => e.eventType === type).length;

  const guideStarted = count(ASSISTANCE_EVENT_TYPES.GUIDE_STARTED);
  const guideCompleted = count(ASSISTANCE_EVENT_TYPES.GUIDE_COMPLETED);

  return {
    guideStarted,
    guideCompleted,
    guideDismissed: count(ASSISTANCE_EVENT_TYPES.GUIDE_DISMISSED),
    guideAbandoned: count(ASSISTANCE_EVENT_TYPES.GUIDE_STEP_ABANDON),
    guideCompletionRate: computeGuideCompletionRate(guideCompleted, guideStarted),
    walkthroughsStarted: count(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_STARTED),
    walkthroughsCompleted: count(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_COMPLETED),
    walkthroughsAbandoned: count(ASSISTANCE_EVENT_TYPES.WALKTHROUGH_ABANDONED),
    missionsStarted: count(ASSISTANCE_EVENT_TYPES.MISSION_STARTED),
    missionsCompleted: count(ASSISTANCE_EVENT_TYPES.MISSION_COMPLETED),
    hintsDismissed: aggregateHintDismissals(events),
    feedbackCount: feedbackAgg._count,
    avgFeedbackRating: Math.round((feedbackAgg._avg.rating ?? 0) * 10) / 10,
    stepAbandonment: aggregateStepAbandonment(events),
  };
}