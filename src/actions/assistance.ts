"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { getHiddenNavKeys } from "@/lib/nav-access";
import { getCoachTip } from "@/lib/assistance/coach";
import {
  getMissionsForRole,
  inferFocusRole,
  type AssistanceFocusRole,
  type MissionKey,
} from "@/lib/assistance/missions";
import type { ContextualHintId } from "@/lib/assistance/hints";
import { ASSISTANCE_EVENT_TYPES } from "@/lib/assistance/analytics";
import { trackAssistanceEvent } from "@/actions/assistance-analytics";
import type { WalkthroughState } from "@/lib/assistance/walkthroughs";
import { parseWalkthroughState } from "@/lib/assistance/walkthroughs";

export type MissionProgress = Record<MissionKey, boolean>;

export type AssistanceState = {
  guideEnabled: boolean;
  clubSetupComplete: boolean;
  focusRole: AssistanceFocusRole;
  showRolePrompt: boolean;
  dismissedHints: string[];
  missionsDismissed: boolean;
  missionProgress: MissionProgress;
  missions: ReturnType<typeof getMissionsForRole>;
  coachTip: ReturnType<typeof getCoachTip>;
  allMissionsComplete: boolean;
  walkthroughState: WalkthroughState;
};

async function detectMissionProgress(clubId: string): Promise<MissionProgress> {
  const [
    meetingCount,
    attendanceCount,
    minuteDraftCount,
    minuteFinalizedCount,
    memberCount,
    duesCount,
    treasuryCount,
    userCount,
    emailCampaignCount,
    eventCount,
    clubProfile,
  ] = await Promise.all([
    prisma.meeting.count({ where: { clubId } }),
    prisma.meetingAttendance.count({ where: { meeting: { clubId } } }),
    prisma.minute.count({
      where: {
        clubId,
        status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
      },
    }),
    prisma.minute.count({ where: { clubId, status: "FINALIZED" } }),
    prisma.member.count({ where: { clubId, isActive: true } }),
    prisma.duesPayment.count({ where: { clubId } }),
    prisma.budgetEntry.count({ where: { clubId } }),
    prisma.clubMembership.count({
      where: { clubId, isActive: true, approvalStatus: "APPROVED" },
    }),
    prisma.emailCampaign.count({ where: { clubId, status: "SENT" } }),
    prisma.clubEvent.count({ where: { clubId } }),
    prisma.club.findUnique({
      where: { id: clubId },
      select: { meetingLocation: true, presidentName: true, secretaryName: true },
    }),
  ]);

  return {
    schedule_meeting: meetingCount > 0,
    run_live_meeting: attendanceCount > 0,
    draft_minute: minuteDraftCount > 0 || minuteFinalizedCount > 0,
    finalize_minute: minuteFinalizedCount > 0,
    add_members: memberCount > 0,
    record_dues: duesCount > 0,
    treasury_entry: treasuryCount > 0,
    invite_team: userCount > 1,
    send_email: emailCampaignCount > 0,
    explore_calendar: meetingCount > 0,
    create_event: eventCount > 0,
    configure_settings: !!(
      clubProfile?.meetingLocation &&
      clubProfile?.presidentName &&
      clubProfile?.secretaryName
    ),
    review_attendance: attendanceCount > 0,
    update_profile: memberCount > 0,
  };
}

export async function getAssistanceState(): Promise<AssistanceState | null> {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return null;

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    select: {
      assistanceFocusRole: true,
      dismissedHints: true,
      coachStartedAt: true,
      missionsDismissedAt: true,
      walkthroughState: true,
    },
  });

  const onboarding = await prisma.clubOnboarding.findUnique({
    where: { clubId: ctx.clubId },
    select: { currentStep: true, completedAt: true },
  });

  const clubSetupComplete =
    onboarding?.currentStep === "COMPLETE" || onboarding?.completedAt != null;
  const guideEnabled = ctx.club.guideEnabled;

  const focusRole = (membership?.assistanceFocusRole ??
    inferFocusRole(ctx.role)) as AssistanceFocusRole;

  const hiddenNavKeys = getHiddenNavKeys(ctx.role, ctx.features, false);
  const missions = getMissionsForRole(focusRole, hiddenNavKeys);
  const missionProgress = await detectMissionProgress(ctx.clubId);

  const allMissionsComplete =
    missions.length > 0 &&
    missions.every((m) => missionProgress[m.key]);

  let coachStartedAt = membership?.coachStartedAt;
  if (guideEnabled && clubSetupComplete && !coachStartedAt) {
    coachStartedAt = new Date();
    await prisma.clubMembership.update({
      where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
      data: { coachStartedAt },
    });
  }

  return {
    guideEnabled,
    clubSetupComplete,
    focusRole,
    showRolePrompt:
      guideEnabled && clubSetupComplete && !membership?.assistanceFocusRole,
    dismissedHints: membership?.dismissedHints ?? [],
    missionsDismissed: membership?.missionsDismissedAt != null,
    missionProgress,
    missions,
    coachTip: getCoachTip(coachStartedAt ?? null, missionProgress),
    allMissionsComplete,
    walkthroughState: parseWalkthroughState(membership?.walkthroughState),
  };
}

async function revalidateAssistance() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}`, "layout");
  }
}

export async function setAssistanceFocusRole(role: AssistanceFocusRole) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  await prisma.clubMembership.update({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    data: { assistanceFocusRole: role },
  });

  await revalidateAssistance();
  return { success: true as const };
}

export async function dismissContextualHint(hintId: ContextualHintId | string) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    select: { dismissedHints: true },
  });

  const dismissed = [...new Set([...(membership?.dismissedHints ?? []), hintId])];

  await prisma.clubMembership.update({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    data: { dismissedHints: dismissed },
  });

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.HINT_DISMISSED, { hintId });

  return { success: true as const };
}

export async function dismissMissionChecklist() {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  await prisma.clubMembership.update({
    where: { clubId_userId: { clubId: ctx.clubId, userId: ctx.userId } },
    data: { missionsDismissedAt: new Date() },
  });

  await revalidateAssistance();
  return { success: true as const };
}