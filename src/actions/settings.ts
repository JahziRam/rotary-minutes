"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function updateClubSettings(data: {
  name: string;
  district?: string;
  country: string;
  city: string;
  meetingLocation?: string;
  meetingDay?: string;
  meetingTime?: string;
  email?: string;
  website?: string;
}) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: {
      name: data.name,
      district: data.district || null,
      country: data.country,
      city: data.city,
      meetingLocation: data.meetingLocation || null,
      meetingDay: data.meetingDay || null,
      meetingTime: data.meetingTime || null,
      email: data.email || null,
      website: data.website || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_SETTINGS_UPDATED",
      entity: "Club",
      entityId: ctx.clubId,
    },
  });

  revalidatePath("/fr/settings");
  revalidatePath("/en/settings");
  revalidatePath("/fr/dashboard");
  revalidatePath("/en/dashboard");
  return { success: true };
}