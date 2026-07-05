"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getAgendaTemplateForMeeting } from "@/lib/minute-templates";
import type { OnboardingStepKey } from "@/generated/prisma/client";

const STEPS: OnboardingStepKey[] = [
  "CLUB_PROFILE",
  "MEMBERS",
  "FIRST_MEETING",
  "INVITE_USERS",
  "COMPLETE",
];

export async function getClubOnboarding() {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return null;
  const { ctx } = auth;

  return prisma.clubOnboarding.findUnique({ where: { clubId: ctx.clubId } });
}

export async function completeOnboardingStep(step: OnboardingStepKey) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const current = await prisma.clubOnboarding.findUnique({
    where: { clubId: ctx.clubId },
  });
  const completed = [...new Set([...(current?.completedSteps ?? []), step])];
  const nextIdx = STEPS.indexOf(step) + 1;
  const nextStep = STEPS[nextIdx] ?? "COMPLETE";
  const allDone = completed.length >= STEPS.length - 1;

  await prisma.clubOnboarding.upsert({
    where: { clubId: ctx.clubId },
    update: {
      completedSteps: completed,
      currentStep: allDone ? "COMPLETE" : nextStep,
      completedAt: allDone ? new Date() : null,
    },
    create: {
      clubId: ctx.clubId,
      completedSteps: completed,
      currentStep: nextStep,
      completedAt: allDone ? new Date() : null,
    },
  });

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/onboarding`);
  }
  return { success: true };
}

export async function createOnboardingMeeting(
  data: { date: string; location?: string; startTime?: string },
  locale: string
) {
  const auth = await requirePermission("meetings.create");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

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

  const templateItems = await getAgendaTemplateForMeeting("STATUTORY", locale, ctx.clubId);

  await prisma.minute.create({
    data: {
      clubId: ctx.clubId,
      meetingId: meeting.id,
      title: `PV — ${new Date(data.date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}`,
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

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/meetings`);
    revalidatePath(`/${loc}/dashboard`);
  }

  return { success: true, meetingId: meeting.id };
}