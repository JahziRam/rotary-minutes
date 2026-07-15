"use server";

import { randomUUID } from "crypto";
import { addHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function ensureMeetingCheckInToken(meetingId: string) {
  const auth = await requirePermission("meetings.edit");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, clubId: ctx.clubId },
  });
  if (!meeting) return { error: "NOT_FOUND" };

  const existing = await prisma.meetingCheckInToken.findUnique({
    where: { meetingId },
  });
  if (existing && existing.expiresAt > new Date()) {
    return { success: true, token: existing.token };
  }

  const token = randomUUID().replace(/-/g, "").slice(0, 16);
  const expiresAt = addHours(meeting.date, 6);

  await prisma.meetingCheckInToken.upsert({
    where: { meetingId },
    update: { token, expiresAt },
    create: { meetingId, token, expiresAt },
  });

  return { success: true, token };
}

export async function getCheckInMeeting(token: string) {
  const row = await prisma.meetingCheckInToken.findUnique({
    where: { token },
    include: {
      meeting: {
        include: {
          club: { select: { name: true, id: true } },
        },
      },
    },
  });
  if (!row || row.expiresAt < new Date()) return null;

  const { attendanceEligibleMemberWhere } = await import(
    "@/lib/member-attendance-eligibility"
  );
  const members = await prisma.member.findMany({
    where: attendanceEligibleMemberWhere(row.meeting.clubId),
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  return { meeting: row.meeting, members, token: row.token };
}

export async function processCheckIn(
  token: string,
  data: { memberId?: string; guestName?: string }
) {
  const row = await prisma.meetingCheckInToken.findUnique({
    where: { token },
    include: { meeting: true },
  });
  if (!row || row.expiresAt < new Date()) return { error: "EXPIRED" };

  if (!data.memberId && !data.guestName?.trim()) {
    return { error: "INVALID" };
  }

  if (data.memberId) {
    const existing = await prisma.meetingAttendance.findFirst({
      where: { meetingId: row.meetingId, memberId: data.memberId },
    });
    if (existing) {
      await prisma.meetingAttendance.update({
        where: { id: existing.id },
        data: { category: "PRESENT" },
      });
    } else {
      await prisma.meetingAttendance.create({
        data: {
          meetingId: row.meetingId,
          memberId: data.memberId,
          category: "PRESENT",
          notes: "QR check-in",
        },
      });
    }
  } else {
    await prisma.meetingAttendance.create({
      data: {
        meetingId: row.meetingId,
        guestName: data.guestName!.trim(),
        category: "VISITOR",
        notes: "QR check-in",
      },
    });
  }

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/meetings/${row.meetingId}/attendance`);
    revalidatePath(`/${loc}/statistics`);
  }

  return { success: true };
}