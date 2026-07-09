"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRole } from "@/generated/prisma/client";

function revalidate() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/notifications`);
    revalidatePath(`/${loc}/dashboard`);
  }
}

export async function sendClubAnnouncement(data: {
  title: string;
  message: string;
  targetRoles: string[];
}) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const canSend =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false)) ||
    ["PRESIDENT", "SECRETARY", "ADMIN"].includes(ctx.role);

  if (!canSend) return { error: "FORBIDDEN" as const };

  const roles = data.targetRoles.length
    ? (data.targetRoles as ClubRole[])
    : (["PRESIDENT", "SECRETARY", "TREASURER", "ADMIN", "MEMBERSHIP_CHAIR"] as ClubRole[]);

  const announcement = await prisma.clubAnnouncement.create({
    data: {
      clubId: ctx.clubId,
      authorId: ctx.userId,
      title: data.title.trim(),
      message: data.message.trim(),
      targetRoles: roles,
    },
  });

  const memberships = await prisma.clubMembership.findMany({
    where: { clubId: ctx.clubId, isActive: true, role: { in: roles } },
    select: { userId: true },
  });

  const locale = ctx.club.language === "EN" ? "en" : "fr";
  if (memberships.length) {
    await prisma.notification.createMany({
      data: memberships.map((m) => ({
        userId: m.userId,
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
  return { success: true as const, announcementId: announcement.id, recipients: memberships.length };
}