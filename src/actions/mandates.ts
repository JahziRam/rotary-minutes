"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getRotaryMandateYear } from "@/lib/rotary";
import type { ClubRole } from "@/generated/prisma/client";

export async function getOfficerMandates() {
  const auth = await requirePermission("members.manage");
  if (auth.error) return [];
  const { ctx } = auth;

  const mandate = getRotaryMandateYear();
  return prisma.officerMandate.findMany({
    where: {
      clubId: ctx.clubId,
      startDate: { lte: mandate.end },
      endDate: { gte: mandate.start },
    },
    include: { member: true },
    orderBy: { role: "asc" },
  });
}

export async function upsertOfficerMandate(data: {
  id?: string;
  role: ClubRole;
  holderName: string;
  memberId?: string;
  startDate: string;
  endDate: string;
}) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const payload = {
    clubId: ctx.clubId,
    role: data.role,
    holderName: data.holderName,
    memberId: data.memberId || null,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
  };

  if (data.id) {
    await prisma.officerMandate.update({ where: { id: data.id }, data: payload });
  } else {
    const created = await prisma.officerMandate.create({ data: payload });
    const { syncMandateRecord } = await import("@/actions/governance");
    void syncMandateRecord(created.id, "start", ctx.userId);
  }

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
  }
  return { success: true };
}

export async function deleteOfficerMandate(id: string) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const row = await prisma.officerMandate.findFirst({
    where: { id, clubId: ctx.clubId },
  });
  if (!row) return { error: "NOT_FOUND" };

  await prisma.officerMandate.delete({ where: { id } });
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
  }
  return { success: true };
}