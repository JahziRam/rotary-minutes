"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSuperAdmin } from "@/lib/require-permission";
import {
  assertMinuteAccess,
  loadMinuteForContext,
} from "@/lib/commission-scope";
import { polishAgendaItemNotes } from "@/lib/minute-ai";
import { resolveMinuteAiAccess } from "@/lib/minute-ai-access";
import { getMinuteAiPlatformConfig } from "@/lib/minute-ai-config";

function revalidateMinuteAiPaths(minuteId: string) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
  }
}

export async function getMinuteAiStatus() {
  const auth = await requirePermission("minutes.view");
  if (auth.error) return auth;
  const { ctx } = auth;

  const access = await resolveMinuteAiAccess(ctx.clubId, ctx.features, ctx.isSuperAdmin);
  return {
    enabled: access.ok,
    remaining: access.remaining,
    quota: access.quota,
    error: access.ok ? null : access.error,
  };
}

export async function polishMinuteAgendaItem(
  minuteId: string,
  agendaItemId: string,
  rawNotes: string
) {
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return auth;
  const { ctx } = auth;

  const access = await resolveMinuteAiAccess(ctx.clubId, ctx.features, ctx.isSuperAdmin);
  if (!access.ok) {
    return { error: access.error };
  }

  const minute = await loadMinuteForContext(ctx, minuteId);
  if (!minute) return { error: "NOT_FOUND" as const };
  if (["FINALIZED", "ARCHIVED"].includes(minute.status)) {
    return { error: "LOCKED" as const };
  }

  const accessMeeting = await assertMinuteAccess(ctx, minute);
  if ("error" in accessMeeting) return { error: accessMeeting.error };

  const item = await prisma.agendaItem.findFirst({
    where: { id: agendaItemId, minuteId, minute: { clubId: ctx.clubId } },
  });
  if (!item) return { error: "NOT_FOUND" as const };

  const notes = rawNotes.trim();
  if (!notes) return { error: "EMPTY_NOTES" as const };

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { language: true },
  });
  const locale =
    club?.language === "EN" ? "en" : club?.language === "ES" ? "es" : "fr";

  const platform = await getMinuteAiPlatformConfig();

  try {
    const polished = await polishAgendaItemNotes(
      {
        locale,
        meetingType: minute.meeting.type,
        agendaTitle: item.title,
        rawNotes: notes,
        existingDecisions: item.decisions ?? "",
        existingActions: item.actions ?? "",
        existingResponsible: item.responsible ?? "",
        existingDueDate: item.dueDate
          ? item.dueDate.toISOString().split("T")[0]
          : "",
      },
      platform.model
    );

    await prisma.auditLog.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        action: "MINUTE_AI_POLISH",
        entity: "AgendaItem",
        entityId: agendaItemId,
        metadata: {
          minuteId,
          agendaTitle: item.title,
        },
      },
    });

    revalidateMinuteAiPaths(minuteId);

    return {
      success: true as const,
      polished,
      remaining: Math.max(0, access.remaining - 1),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI_ERROR";
    if (message === "API_KEY_MISSING") return { error: "API_KEY_MISSING" as const };
    if (message === "EMPTY_NOTES") return { error: "EMPTY_NOTES" as const };
    if (message.startsWith("API_ERROR")) return { error: "AI_UNAVAILABLE" as const };
    return { error: "AI_ERROR" as const };
  }
}

export async function updateMinuteAiPlatformSettings(data: {
  globallyEnabled: boolean;
  monthlyQuotaPerClub: number;
  model?: string;
}) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth;

  const quota = Math.max(1, Math.min(500, Math.round(data.monthlyQuotaPerClub)));
  const { saveMinuteAiPlatformConfig } = await import("@/lib/minute-ai-config");
  await saveMinuteAiPlatformConfig({
    globallyEnabled: data.globallyEnabled,
    monthlyQuotaPerClub: quota,
    ...(data.model?.trim() ? { model: data.model.trim() } : {}),
  });

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/admin/settings`);
  }

  return { success: true as const };
}