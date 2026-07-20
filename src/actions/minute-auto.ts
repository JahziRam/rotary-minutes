"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import {
  buildAutoMinuteFreeText,
  enrichAgendaFromMeeting,
} from "@/lib/minute-auto-generate";
import { attendanceWithMemberInclude } from "@/lib/pdf/build-minute-pdf";
import { assertMinuteEditable } from "@/lib/minute-lock";

function revalidateMinute(minuteId: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/minutes/${minuteId}`);
    revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
  }
}

/** Génère le brouillon PV à partir de l'ordre du jour, présences et visiteurs. */
export async function autoGenerateMinuteFromMeeting(minuteId: string, locale = "fr") {
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return auth;
  const { ctx } = auth;

  const minute = await prisma.minute.findFirst({
    where: { id: minuteId, clubId: ctx.clubId },
    include: {
      agendaItems: { orderBy: { sortOrder: "asc" } },
      meeting: { include: { attendances: attendanceWithMemberInclude } },
    },
  });
  if (!minute) return { error: "NOT_FOUND" as const };
  const lock = assertMinuteEditable(minute.status, ctx);
  if (lock) return lock;

  const meeting = {
    date: minute.meeting.date,
    location: minute.meeting.location,
    type: minute.meeting.type,
    presidedBy: minute.meeting.presidedBy,
    secretary: minute.meeting.secretary,
    attendances: minute.meeting.attendances.map((a) => ({
      category: a.category,
      guestName: a.guestName,
      member: a.member,
    })),
  };

  const enriched = enrichAgendaFromMeeting(minute.agendaItems, meeting, locale);
  const freeText = buildAutoMinuteFreeText(meeting, locale);

  for (const item of enriched) {
    await prisma.agendaItem.update({
      where: { id: item.id },
      data: {
        decisions: item.decisions ?? undefined,
        actions: item.actions ?? undefined,
      },
    });
  }

  await prisma.minute.update({
    where: { id: minuteId },
    data: {
      freeText,
      status: minute.status === "DRAFT" ? "IN_PROGRESS" : minute.status,
    },
  });

  revalidateMinute(minuteId);
  return { success: true as const };
}