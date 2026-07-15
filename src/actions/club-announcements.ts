"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { resolveClubAnnouncementDelivery } from "@/lib/club-announcement-targeting";
import { clubAnnouncementEmail } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { recordEmailCampaign } from "@/lib/email-history";
import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";

function revalidate() {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/notifications`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/settings`);
  }
}

function clubLocale(language: string): "fr" | "en" | "es" {
  if (language === "EN") return "en";
  if (language === "ES") return "es";
  return "fr";
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

  const delivery = await resolveClubAnnouncementDelivery({
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

  const locale = clubLocale(ctx.club.language);

  if (delivery.userIds.length) {
    await prisma.notification.createMany({
      data: delivery.userIds.map((userId) => ({
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

  let emailsSent = 0;
  let emailsFailed = 0;
  const emailRecipients: Array<{
    email: string;
    status: "sent" | "failed";
    error?: string | null;
  }> = [];

  if (delivery.emails.length) {
    const mail = await clubAnnouncementEmail({
      clubName: ctx.club.name,
      clubId: ctx.clubId,
      title: data.title.trim(),
      message: data.message.trim(),
      locale,
      logoUrl: ctx.club.logoUrl ?? undefined,
    });

    for (const to of delivery.emails) {
      const result = await sendClubEmail(ctx.clubId, {
        to,
        subject: mail.subject,
        html: mail.html,
        attachments: mail.attachments,
      });
      if (result.ok) emailsSent++;
      else emailsFailed++;
      emailRecipients.push({
        email: to,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? null,
      });
    }

    if (emailRecipients.length) {
      await recordEmailCampaign({
        clubId: ctx.clubId,
        name:
          locale === "fr"
            ? `Annonce club — ${data.title.trim().slice(0, 80)}`
            : locale === "es"
              ? `Anuncio del club — ${data.title.trim().slice(0, 80)}`
              : `Club announcement — ${data.title.trim().slice(0, 80)}`,
        subject: mail.subject,
        body: mail.html,
        recipients: emailRecipients,
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "CLUB_ANNOUNCEMENT_SENT",
      entity: "ClubAnnouncement",
      entityId: announcement.id,
      metadata: {
        targetType: data.targetType,
        inApp: delivery.userIds.length,
        emails: delivery.emails.length,
        emailsSent,
        emailsFailed,
      },
    },
  });

  revalidate();
  return {
    success: true as const,
    announcementId: announcement.id,
    recipients: delivery.userIds.length,
    emails: delivery.emails.length,
    emailsSent,
    emailsFailed,
  };
}