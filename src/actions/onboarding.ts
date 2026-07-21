"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import {
  detectCompletedOnboardingSteps,
  isOnboardingComplete,
  mergeOnboardingSteps,
  nextOnboardingStep,
  ONBOARDING_WIZARD_STEPS,
} from "@/lib/onboarding-steps";
import type { OnboardingStepKey } from "@/generated/prisma/client";
import type { ClubContext } from "@/lib/club-context";

/** Officers who can drive club setup (not regular members/readers). */
export async function canManageClubOnboarding(
  ctx: Pick<ClubContext, "role" | "isSuperAdmin" | "customRoleId">
): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  const checks = await Promise.all([
    hasRolePermission(ctx.role, "settings.manage", false, ctx.customRoleId),
    hasRolePermission(ctx.role, "members.manage", false, ctx.customRoleId),
    hasRolePermission(ctx.role, "users.manage", false, ctx.customRoleId),
    hasRolePermission(ctx.role, "meetings.create", false, ctx.customRoleId),
  ]);
  return checks.some(Boolean);
}

async function requireOnboardingManager() {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };
  if (!(await canManageClubOnboarding(ctx))) {
    return { error: "FORBIDDEN" as const };
  }
  return { ctx };
}

function revalidateOnboardingPaths() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/onboarding`);
    revalidatePath(`/${loc}/minutes`);
    revalidatePath(`/${loc}/meetings`);
    revalidatePath(`/${loc}/settings`);
  }
}

export async function getOnboardingSignals(clubId: string) {
  const [club, memberCount, meetingCount, userCount, minuteCount] =
    await Promise.all([
      prisma.club.findUnique({
        where: { id: clubId },
        select: {
          name: true,
          city: true,
          country: true,
          meetingLocation: true,
          meetingDay: true,
          meetingTime: true,
        },
      }),
      prisma.member.count({ where: { clubId, isActive: true } }),
      prisma.meeting.count({ where: { clubId } }),
      prisma.clubMembership.count({
        where: { clubId, isActive: true, approvalStatus: "APPROVED" },
      }),
      prisma.minute.count({ where: { clubId } }),
    ]);

  return {
    hasClubProfile: !!(
      club?.name?.trim() &&
      club?.city?.trim() &&
      club?.country?.trim() &&
      (club?.meetingLocation?.trim() || club?.meetingDay?.trim())
    ),
    hasMembers: memberCount >= 1,
    hasMeeting: meetingCount >= 1,
    hasInvitedUsers: userCount > 1,
    hasMinute: minuteCount >= 1,
    counts: {
      members: memberCount,
      meetings: meetingCount,
      users: userCount,
      minutes: minuteCount,
    },
  };
}

/** Sync completed steps from real club activity; returns up-to-date onboarding row. */
export async function syncClubOnboardingProgress(clubId: string) {
  const signals = await getOnboardingSignals(clubId);
  const detected = detectCompletedOnboardingSteps(signals);
  const current = await prisma.clubOnboarding.findUnique({
    where: { clubId },
  });

  if (!current) {
    const completed = detected;
    const next = nextOnboardingStep(completed);
    const allDone = next === "COMPLETE";
    return prisma.clubOnboarding.create({
      data: {
        clubId,
        completedSteps: completed,
        currentStep: allDone ? "COMPLETE" : next,
        completedAt: allDone ? new Date() : null,
      },
    });
  }

  if (current.completedAt || current.currentStep === "COMPLETE") {
    return current;
  }

  const completed = mergeOnboardingSteps(current.completedSteps, detected);
  const next = nextOnboardingStep(completed);
  const allDone = next === "COMPLETE";

  if (
    completed.length === current.completedSteps.length &&
    completed.every((s) => current.completedSteps.includes(s)) &&
    current.currentStep === next
  ) {
    return current;
  }

  return prisma.clubOnboarding.update({
    where: { clubId },
    data: {
      completedSteps: completed,
      currentStep: allDone ? "COMPLETE" : next,
      completedAt: allDone ? new Date() : null,
    },
  });
}

export async function getClubOnboarding() {
  const auth = await requireOnboardingManager();
  if ("error" in auth) return null;
  const { ctx } = auth;
  return syncClubOnboardingProgress(ctx.clubId);
}

export type OnboardingBootstrap = {
  currentStep: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
  progressPercent: number;
  counts: {
    members: number;
    meetings: number;
    users: number;
    minutes: number;
  };
  latestDraftMinuteId: string | null;
  canManage: boolean;
};

export async function getOnboardingBootstrap(): Promise<OnboardingBootstrap | null> {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return null;

  const canManage = await canManageClubOnboarding(ctx);
  if (!canManage) return null;

  const [onboarding, signals, latestDraft] = await Promise.all([
    syncClubOnboardingProgress(ctx.clubId),
    getOnboardingSignals(ctx.clubId),
    prisma.minute.findFirst({
      where: {
        clubId: ctx.clubId,
        status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ]);

  const completed = onboarding.completedSteps.filter((s) => s !== "COMPLETE");
  const progressPercent = Math.round(
    (completed.filter((s) => ONBOARDING_WIZARD_STEPS.includes(s)).length /
      ONBOARDING_WIZARD_STEPS.length) *
      100
  );

  return {
    currentStep: onboarding.currentStep,
    completedSteps: completed,
    progressPercent,
    counts: signals.counts,
    latestDraftMinuteId: latestDraft?.id ?? null,
    canManage: true,
  };
}

export async function completeOnboardingStep(step: OnboardingStepKey) {
  const auth = await requireOnboardingManager();
  if ("error" in auth) return { error: auth.error };
  const { ctx } = auth;

  if (step === "COMPLETE") {
    return finishOnboarding();
  }

  const current = await prisma.clubOnboarding.findUnique({
    where: { clubId: ctx.clubId },
  });
  const completed = mergeOnboardingSteps(current?.completedSteps ?? [], [step]);
  const next = nextOnboardingStep(completed);
  const allDone = next === "COMPLETE";

  await prisma.clubOnboarding.upsert({
    where: { clubId: ctx.clubId },
    update: {
      completedSteps: completed,
      currentStep: allDone ? "COMPLETE" : next,
      completedAt: allDone ? new Date() : null,
    },
    create: {
      clubId: ctx.clubId,
      completedSteps: completed,
      currentStep: allDone ? "COMPLETE" : next,
      completedAt: allDone ? new Date() : null,
    },
  });

  revalidateOnboardingPaths();
  return { success: true as const, nextStep: allDone ? ("COMPLETE" as const) : next };
}

export async function finishOnboarding() {
  const auth = await requireOnboardingManager();
  if ("error" in auth) return { error: auth.error };
  const { ctx } = auth;

  await prisma.clubOnboarding.upsert({
    where: { clubId: ctx.clubId },
    update: {
      currentStep: "COMPLETE",
      completedAt: new Date(),
      completedSteps: ONBOARDING_WIZARD_STEPS,
    },
    create: {
      clubId: ctx.clubId,
      currentStep: "COMPLETE",
      completedAt: new Date(),
      completedSteps: ONBOARDING_WIZARD_STEPS,
    },
  });

  revalidateOnboardingPaths();
  return { success: true as const };
}

export async function createOnboardingMeeting(
  data: { date: string; location?: string; startTime?: string },
  locale: string
) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  if (!(await canManageClubOnboarding(ctx))) {
    return { error: "FORBIDDEN" as const };
  }

  const meeting = await prisma.meeting.create({
    data: {
      clubId: ctx.clubId,
      date: new Date(data.date),
      location: data.location || ctx.club.meetingLocation,
      startTime: data.startTime || ctx.club.meetingTime,
      presidedBy: ctx.club.presidentName,
      secretary: ctx.club.secretaryName,
      type: "STATUTORY",
    },
  });

  const templateItems = await getAgendaTemplateForMeeting(
    "STATUTORY",
    locale,
    ctx.clubId
  );

  const minute = await prisma.minute.create({
    data: {
      clubId: ctx.clubId,
      meetingId: meeting.id,
      title: `PV — ${new Date(data.date).toLocaleDateString(
        locale === "en" ? "en-GB" : locale === "es" ? "es-ES" : "fr-FR"
      )}`,
      authorId: ctx.userId,
      agendaItems: {
        create: templateItems.map((item, i) => ({
          sortOrder: i,
          title: item.title,
          description: item.description ?? null,
          status: (item.status ?? "OPEN") as "OPEN",
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MEETING_CREATED",
      entity: "Meeting",
      entityId: meeting.id,
    },
  });

  // Mark both meeting + first minute draft as progress.
  await completeOnboardingStep("FIRST_MEETING");

  revalidateOnboardingPaths();
  return {
    success: true as const,
    meetingId: meeting.id,
    minuteId: minute.id,
  };
}

export { isOnboardingComplete, ONBOARDING_WIZARD_STEPS };
