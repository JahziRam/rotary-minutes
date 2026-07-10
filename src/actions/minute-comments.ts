"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { ensureRoleConfigs, hasRolePermission } from "@/lib/roles";

const MAX_COMMENT_LENGTH = 4000;

function revalidateMinuteComments(minuteId: string) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/minutes/${minuteId}`);
    revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
  }
}

export type MinuteCommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  isOwn: boolean;
};

export async function listMinuteComments(minuteId: string): Promise<{
  comments?: MinuteCommentDTO[];
  error?: string;
  canComment?: boolean;
  canModerate?: boolean;
}> {
  await ensureRoleConfigs();
  const auth = await requirePermission("minutes.view");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    select: { id: true, status: true },
  });
  if (!minute) return { error: "NOT_FOUND" };

  const canComment =
    minute.status !== "ARCHIVED" &&
    (await hasRolePermission(ctx.role, "minutes.comment", ctx.isSuperAdmin, ctx.customRoleId));
  const canModerate = await hasRolePermission(
    ctx.role,
    "minutes.edit",
    ctx.isSuperAdmin,
    ctx.customRoleId
  );

  const rows = await prisma.minuteComment.findMany({
    where: { minuteId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return {
    canComment,
    canModerate,
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.author,
      isOwn: c.authorId === ctx.userId,
    })),
  };
}

export async function addMinuteComment(minuteId: string, body: string, locale: string) {
  await ensureRoleConfigs();
  const auth = await requirePermission("minutes.comment");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const text = body.trim();
  if (!text) return { error: "EMPTY" as const };
  if (text.length > MAX_COMMENT_LENGTH) return { error: "TOO_LONG" as const };

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    select: { id: true, status: true, title: true, authorId: true },
  });
  if (!minute) return { error: "NOT_FOUND" as const };
  if (minute.status === "ARCHIVED") return { error: "LOCKED" as const };

  const comment = await prisma.minuteComment.create({
    data: {
      minuteId,
      authorId: ctx.userId,
      body: text,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Notify minute author (if different) that a member commented
  if (minute.authorId && minute.authorId !== ctx.userId) {
    await prisma.notification.create({
      data: {
        userId: minute.authorId,
        clubId: ctx.clubId,
        type: "NEW_MINUTE",
        title:
          locale === "fr"
            ? "Nouveau commentaire sur un PV"
            : locale === "es"
              ? "Nuevo comentario en un acta"
              : "New comment on minutes",
        message: minute.title,
        link: `/${locale}/minutes/${minuteId}`,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_COMMENT_ADDED",
      entity: "MinuteComment",
      entityId: comment.id,
      metadata: { minuteId },
    },
  });

  revalidateMinuteComments(minuteId);
  return {
    success: true as const,
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.author,
      isOwn: true,
    } satisfies MinuteCommentDTO,
  };
}

export async function deleteMinuteComment(commentId: string, locale: string) {
  const auth = await requirePermission("minutes.view");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const comment = await prisma.minuteComment.findFirst({
    where: { id: commentId },
    include: { minute: { select: { id: true, clubId: true, status: true } } },
  });
  if (!comment || comment.minute.clubId !== ctx.clubId) {
    return { error: "NOT_FOUND" as const };
  }

  const canModerate = await hasRolePermission(
    ctx.role,
    "minutes.edit",
    ctx.isSuperAdmin,
    ctx.customRoleId
  );
  if (comment.authorId !== ctx.userId && !canModerate) {
    return { error: "FORBIDDEN" as const };
  }

  await prisma.minuteComment.delete({ where: { id: commentId } });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_COMMENT_DELETED",
      entity: "MinuteComment",
      entityId: commentId,
      metadata: { minuteId: comment.minute.id },
    },
  });

  revalidateMinuteComments(comment.minute.id);
  void locale;
  return { success: true as const };
}
