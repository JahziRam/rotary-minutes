"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { requirePermission } from "@/lib/require-permission";
import { getRotaryMandateYear } from "@/lib/rotary";
import type { DuesStatus } from "@/generated/prisma/client";

function revalidateDues() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/members/dues`);
  }
}

function currentFiscalYear(date = new Date()): number {
  return getRotaryMandateYear(date).start.getFullYear();
}

export async function listMemberDues(fiscalYear?: number) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  const year = fiscalYear ?? currentFiscalYear();
  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { defaultAnnualDues: true, currency: true },
  });

  const [members, duesRows] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: ctx.clubId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.memberDues.findMany({
      where: { clubId: ctx.clubId, fiscalYear: year },
      include: { member: true },
    }),
  ]);

  const duesByMember = new Map(duesRows.map((d) => [d.memberId, d]));

  return {
    fiscalYear: year,
    currency: club?.currency ?? "EUR",
    defaultAnnualDues: club?.defaultAnnualDues ? Number(club.defaultAnnualDues) : null,
    rows: members.map((member) => ({
      member,
      dues: duesByMember.get(member.id) ?? null,
    })),
  };
}

export async function createMemberDues(data: {
  memberId: string;
  fiscalYear?: number;
  amount: number;
  dueDate: string;
  currency?: string;
  notes?: string;
}) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: data.memberId, clubId: ctx.clubId, isActive: true },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  const fiscalYear = data.fiscalYear ?? currentFiscalYear();
  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true },
  });

  const existing = await prisma.memberDues.findUnique({
    where: { memberId_fiscalYear: { memberId: data.memberId, fiscalYear } },
  });
  if (existing) return { error: "ALREADY_EXISTS" as const };

  const dues = await prisma.memberDues.create({
    data: {
      clubId: ctx.clubId,
      memberId: data.memberId,
      fiscalYear,
      amount: data.amount,
      currency: data.currency ?? club?.currency ?? "EUR",
      dueDate: new Date(data.dueDate),
      notes: data.notes || null,
      status: "PENDING",
    },
  });

  revalidateDues();
  return { success: true, dues };
}

export async function markDuesPaid(duesId: string, notes?: string) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const existing = await prisma.memberDues.findFirst({
    where: { id: duesId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing.status === "PAID") return { error: "ALREADY_PAID" as const };

  await prisma.memberDues.update({
    where: { id: duesId },
    data: {
      status: "PAID" as DuesStatus,
      paidAt: new Date(),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  revalidateDues();
  return { success: true };
}

export async function bulkCreateDuesForYear(opts?: {
  fiscalYear?: number;
  amount?: number;
  dueDate?: string;
}) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const fiscalYear = opts?.fiscalYear ?? currentFiscalYear();
  const mandate = getRotaryMandateYear(new Date(fiscalYear, 6, 1));

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { defaultAnnualDues: true, currency: true },
  });

  const amount = opts?.amount ?? (club?.defaultAnnualDues ? Number(club.defaultAnnualDues) : null);
  if (amount == null || amount <= 0) return { error: "NO_DEFAULT_AMOUNT" as const };

  const dueDate = opts?.dueDate ? new Date(opts.dueDate) : mandate.end;

  const members = await prisma.member.findMany({
    where: { clubId: ctx.clubId, isActive: true },
    select: { id: true },
  });

  const existing = await prisma.memberDues.findMany({
    where: {
      clubId: ctx.clubId,
      fiscalYear,
      memberId: { in: members.map((m) => m.id) },
    },
    select: { memberId: true },
  });
  const existingIds = new Set(existing.map((e) => e.memberId));

  const toCreate = members.filter((m) => !existingIds.has(m.id));
  if (toCreate.length === 0) return { success: true, created: 0 };

  await prisma.memberDues.createMany({
    data: toCreate.map((m) => ({
      clubId: ctx.clubId,
      memberId: m.id,
      fiscalYear,
      amount,
      currency: club?.currency ?? "EUR",
      dueDate,
      status: "PENDING" as DuesStatus,
    })),
  });

  revalidateDues();
  return { success: true, created: toCreate.length };
}