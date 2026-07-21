"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { parseMinuteMemberPhotoSize } from "@/lib/minute-member-photo-size";

function revalidateSettings() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/minutes`);
  }
}

export async function updateClubWorkflowSettings(data: {
  presidentApprovalRequired: boolean;
  whatsappReminderPhone?: string | null;
  guideEnabled: boolean;
  minuteShowMemberPhotos: boolean;
  minuteMemberPhotoSize?: string | null;
}) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: {
      presidentApprovalRequired: data.presidentApprovalRequired,
      whatsappReminderPhone: data.whatsappReminderPhone?.trim() || null,
      guideEnabled: data.guideEnabled,
      minuteShowMemberPhotos: data.minuteShowMemberPhotos,
      minuteMemberPhotoSize: parseMinuteMemberPhotoSize(data.minuteMemberPhotoSize),
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_WORKFLOW_SETTINGS_UPDATED",
      entity: "Club",
      entityId: ctx.clubId,
    },
  });

  revalidateSettings();
  return { success: true as const };
}

export async function ensurePublicCalendarToken(regenerate = false) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { publicCalendarToken: true },
  });
  if (!club) return { error: "NOT_FOUND" as const };

  let token = club.publicCalendarToken;
  if (!token || regenerate) {
    token = randomBytes(24).toString("hex");
    await prisma.club.update({
      where: { id: ctx.clubId },
      data: { publicCalendarToken: token },
    });
    revalidateSettings();
  }

  return { success: true as const, token };
}