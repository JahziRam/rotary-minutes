"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-permission";
import { ensureFeatureFlags } from "@/lib/feature-flags";

function revalidateAdminPaths(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/admin/feature-flags`);
    revalidatePath(`/${loc}/admin/clubs`);
  }
  revalidatePath(`/${locale}/admin/feature-flags`);
}

export async function listFeatureFlags() {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return auth;

    await ensureFeatureFlags();
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
      include: {
        _count: { select: { overrides: true } },
      },
    });

    return { success: true as const, flags };
  } catch (e) {
    console.error("[listFeatureFlags]", e);
    return { error: "LOAD_FAILED" as const };
  }
}

export async function updateFeatureFlag(
  key: string,
  data: {
    nameFr?: string;
    nameEn?: string;
    descriptionFr?: string | null;
    descriptionEn?: string | null;
    defaultEnabled?: boolean;
    rolloutPercent?: number;
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const rolloutPercent =
    data.rolloutPercent !== undefined
      ? Math.min(100, Math.max(0, data.rolloutPercent))
      : undefined;

  const flag = await prisma.featureFlag.update({
    where: { key },
    data: {
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      descriptionFr: data.descriptionFr,
      descriptionEn: data.descriptionEn,
      defaultEnabled: data.defaultEnabled,
      rolloutPercent,
      isActive: data.isActive,
    },
  });

  revalidateAdminPaths(locale);
  return { success: true as const, flag };
}

export async function setClubFeatureFlagOverride(
  clubId: string,
  flagKey: string,
  enabled: boolean,
  note: string | null,
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  await ensureFeatureFlags();

  const override = await prisma.clubFeatureFlagOverride.upsert({
    where: { clubId_flagKey: { clubId, flagKey } },
    update: { enabled, note },
    create: { clubId, flagKey, enabled, note },
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: auth.ctx.userId,
      action: "FEATURE_FLAG_OVERRIDE",
      entity: "ClubFeatureFlagOverride",
      entityId: override.id,
      metadata: { flagKey, enabled, note },
    },
  });

  revalidateAdminPaths(locale);
  return { success: true as const, override };
}

export async function clearClubFeatureFlagOverride(
  clubId: string,
  flagKey: string,
  locale: string
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  await prisma.clubFeatureFlagOverride.deleteMany({
    where: { clubId, flagKey },
  });

  revalidateAdminPaths(locale);
  return { success: true as const };
}

export async function listClubFlagOverrides(clubId: string) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth;

  const overrides = await prisma.clubFeatureFlagOverride.findMany({
    where: { clubId },
    include: { flag: true },
    orderBy: { flagKey: "asc" },
  });

  return { success: true as const, overrides };
}