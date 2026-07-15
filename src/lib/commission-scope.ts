import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ClubContext } from "@/lib/club-context";

export async function getCommissionChairCommissionId(
  ctx: ClubContext
): Promise<string | null> {
  if (ctx.role !== "COMMISSION_CHAIR" || ctx.isSuperAdmin) return null;

  const member = await prisma.member.findFirst({
    where: { clubId: ctx.clubId, userId: ctx.userId, isActive: true },
    select: { commissionId: true },
  });

  return member?.commissionId ?? null;
}

export function isCommissionChairRole(ctx: ClubContext): boolean {
  return ctx.role === "COMMISSION_CHAIR" && !ctx.isSuperAdmin;
}

export async function assertCommissionChairHasCommission(
  ctx: ClubContext
): Promise<{ ok: true; commissionId: string } | { error: "COMMISSION_REQUIRED" | "FORBIDDEN" }> {
  if (!isCommissionChairRole(ctx)) return { error: "FORBIDDEN" };
  const commissionId = await getCommissionChairCommissionId(ctx);
  if (!commissionId) return { error: "COMMISSION_REQUIRED" };
  return { ok: true, commissionId };
}

export async function assertCommissionMeetingAccess(
  ctx: ClubContext,
  meeting: { type: string; commissionId: string | null }
): Promise<{ ok: true } | { error: "FORBIDDEN" }> {
  if (!isCommissionChairRole(ctx)) return { ok: true };

  const scope = await getCommissionChairCommissionId(ctx);
  if (!scope) return { error: "FORBIDDEN" };
  if (meeting.type !== "COMMISSION") return { error: "FORBIDDEN" };
  if (!meeting.commissionId || meeting.commissionId !== scope) {
    return { error: "FORBIDDEN" };
  }
  return { ok: true };
}

export async function meetingWhereForContext(
  ctx: ClubContext
): Promise<{ clubId: string; commissionId?: string; type?: "COMMISSION" } | null> {
  if (!isCommissionChairRole(ctx)) return { clubId: ctx.clubId };
  const commissionId = await getCommissionChairCommissionId(ctx);
  if (!commissionId) return { clubId: ctx.clubId, type: "COMMISSION", commissionId: "__none__" };
  return { clubId: ctx.clubId, type: "COMMISSION", commissionId };
}

export async function minuteWhereForContext(
  ctx: ClubContext
): Promise<{ clubId: string; meeting?: { type: "COMMISSION"; commissionId: string } }> {
  if (!isCommissionChairRole(ctx)) {
    return { clubId: ctx.clubId };
  }
  const commissionId = await getCommissionChairCommissionId(ctx);
  if (!commissionId) {
    return {
      clubId: ctx.clubId,
      meeting: { type: "COMMISSION", commissionId: "__none__" },
    };
  }
  return {
    clubId: ctx.clubId,
    meeting: { type: "COMMISSION", commissionId },
  };
}

export async function applyMeetingScopeToWhere(
  ctx: ClubContext,
  where: Prisma.MeetingWhereInput = {}
): Promise<Prisma.MeetingWhereInput> {
  const scope = await meetingWhereForContext(ctx);
  if (!scope) return where;
  return { ...where, ...scope };
}

export async function applyMinuteScopeToWhere(
  ctx: ClubContext,
  where: Prisma.MinuteWhereInput = {}
): Promise<Prisma.MinuteWhereInput> {
  const scope = await minuteWhereForContext(ctx);
  return { ...where, ...scope };
}

export async function assertMinuteAccess(
  ctx: ClubContext,
  minute: { meeting: { type: string; commissionId: string | null } }
): Promise<{ ok: true } | { error: "FORBIDDEN" | "COMMISSION_REQUIRED" }> {
  const access = await assertCommissionMeetingAccess(ctx, minute.meeting);
  if ("error" in access) return access;
  return { ok: true };
}

export async function loadMinuteForContext(
  ctx: ClubContext,
  minuteId: string
) {
  const where = await applyMinuteScopeToWhere(ctx, {
    id: minuteId,
    clubId: ctx.clubId,
  });
  return prisma.minute.findFirst({
    where,
    include: { meeting: { select: { type: true, commissionId: true } } },
  });
}