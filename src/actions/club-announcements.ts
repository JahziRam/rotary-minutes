"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { resolveClubAnnouncementRecipients } from "@/lib/club-announcement-targeting";
import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";

function revalidate() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/notifications`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/settings`);
  }
}

export async function getClubCommissionsForAnnouncements() {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const commissions = await prisma.commission.findMany({
    where: { clubId: ctx.clubId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { commissions };
}

export async function sendClubAnnouncement(data: {
  title: string;
  message: string;
  targetType: ClubAnnouncementTarget;
  targetRoles?: string[];
  targetCommissionId?: string;
}) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const canSend =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false)) ||
    ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN"].includes(ctx.role);

  if (!canSend) return { error: "FORBIDDEN" as const };

  if (data.targetType === "COMMISSION" && !data.targetCommissionId) {
    return { error: "COMMISSION_REQUIRED" as const };
  }

  const roles = (data.targetRoles?.length
    ? data.targetRoles
    : [
        "PRESIDENT",
        "VICE_PRESIDENT",
        "SECRETARY",
        "TREASURER",
        "ADMIN",
        "MEMBERSHIP_CHAIR",
        "COMMISSION_CHAIR",
      ]) as ClubRole[];

  const recipientIds = await resolveClubAnnouncementRecipients({
    clubId: ctx.clubId,
    targetType: data.targetType,
    targetRoles: roles,
    targetCommissionId: data.targetCommissionId,
  });

  const announcement = await prisma.clubAnnouncement.create({
    data: {
      clubId: ctx.clubId,
      authorId: ctx.userId,
      title: data.title.trim(),
      message: data.message.trim(),
      targetType: data.targetType,
      targetRoles: data.targetType === "ROLES" ? roles : [],
      targetCommissionId:
        data.targetType === "COMMISSION" ? data.targetCommissionId : null,
    },
  });

  const locale =
    ctx.club.language === "EN" ? "en" : ctx.club.language === "ES" ? "es" : "fr";

  if (recipientIds.length) {
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        clubId: ctx.clubId,
        type: "ANNOUNCEMENT" as const,
        title: data.title.trim(),
        message: data.message.trim().slice(0, 500),
        link: `/${locale}/notifications`,
      })),
      skipDuplicates: true,
    });
  }

  revalidate();
  return {
    success: true as const,
    announcementId: announcement.id,
    recipients: recipientIds.length,
  };
}