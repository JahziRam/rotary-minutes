"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission } from "@/lib/require-permission";
import { assertMeetingsMinutesAvailable } from "@/lib/meetings-minutes-maintenance";
import type { AttendanceCategory } from "@/generated/prisma/client";

export type AttendanceEntry = {
  memberId?: string;
  guestName?: string;
  category: string;
};

function revalidateAttendance(meetingId: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/meetings/${meetingId}/attendance`);
    revalidatePath(`/${loc}/meetings/${meetingId}/live`);
    revalidatePath(`/${loc}/meetings`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/statistics`);
  }
}

export async function saveMeetingAttendance(
  meetingId: string,
  attendances: AttendanceEntry[]
) {
  const maint = assertMeetingsMinutesAvailable();
  if (maint) return maint;
  const auth = await requirePermission("meetings.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, clubId: ctx.clubId },
  });
  if (!meeting) return { error: "NOT_FOUND" };

  const { getHonoraryMemberIds } = await import("@/lib/member-attendance-eligibility.server");
  const honoraryMemberIds = await getHonoraryMemberIds(ctx.clubId);

  await prisma.meetingAttendance.deleteMany({ where: { meetingId } });
  const valid = attendances.filter(
    (a) =>
      (a.memberId && !honoraryMemberIds.has(a.memberId)) || a.guestName?.trim()
  );
  if (valid.length > 0) {
    await prisma.meetingAttendance.createMany({
      data: valid.map((a) => ({
        meetingId,
        memberId: a.memberId ?? null,
        guestName: a.guestName?.trim() || null,
        category: a.category as AttendanceCategory,
      })),
    });
  }

  revalidateAttendance(meetingId);
  return { success: true };
}

export async function markAllPresent(meetingId: string, memberIds: string[]) {
  const entries = memberIds.map((memberId) => ({
    memberId,
    category: "PRESENT",
  }));
  return saveMeetingAttendance(meetingId, entries);
}