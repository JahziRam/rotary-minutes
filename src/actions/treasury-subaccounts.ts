"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { requireFeature } from "@/lib/require-feature";

function revalidateTreasury() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/treasury`);
  }
}

async function requireTreasuryManage() {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  return auth;
}

export async function listSubAccounts(opts?: { includeInactive?: boolean }) {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return { error: feature.error as string };
  const { ctx } = feature;

  const subAccounts = await prisma.treasurySubAccount.findMany({
    where: {
      clubId: ctx.clubId,
      ...(opts?.includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    subAccounts: subAccounts.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
    })),
  };
}

export async function createSubAccount(data: {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const name = data.name.trim();
  if (!name) return { error: "INVALID_NAME" as const };

  const maxOrder = await prisma.treasurySubAccount.aggregate({
    where: { clubId: ctx.clubId },
    _max: { sortOrder: true },
  });

  const subAccount = await prisma.treasurySubAccount.create({
    data: {
      clubId: ctx.clubId,
      name,
      code: data.code?.trim() || null,
      description: data.description?.trim() || null,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidateTreasury();
  return { success: true, subAccount };
}

export async function updateSubAccount(
  subAccountId: string,
  data: {
    name?: string;
    code?: string | null;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.treasurySubAccount.findFirst({
    where: { id: subAccountId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  if (data.name !== undefined && !data.name.trim()) {
    return { error: "INVALID_NAME" as const };
  }

  await prisma.treasurySubAccount.update({
    where: { id: subAccountId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.code !== undefined && { code: data.code?.trim() || null }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidateTreasury();
  return { success: true };
}

/** Soft-deactivate a sub-account (entries keep their link). */
export async function deleteSubAccount(subAccountId: string) {
  const auth = await requireTreasuryManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.treasurySubAccount.findFirst({
    where: { id: subAccountId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.treasurySubAccount.update({
    where: { id: subAccountId },
    data: { isActive: false },
  });

  revalidateTreasury();
  return { success: true };
}