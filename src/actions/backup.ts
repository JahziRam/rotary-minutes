"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import type { BackupScope } from "@/generated/prisma/client";

async function exportClubData(clubId: string, scope: BackupScope) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      members: true,
      meetings: { include: { attendances: true } },
      minutes: { include: { versions: true } },
      memberDues: true,
      duesPayments: true,
      budgetCategories: true,
      budgetEntries: true,
      clubEvents: { include: { registrations: true, priceTiers: true, ticketSlots: true } },
      clubDocuments: scope === "FULL",
      documentFolders: scope === "FULL",
      clubActions: true,
    },
  });
  return club;
}

async function exportPlatformData(scope: BackupScope) {
  const [clubs, users, planConfigs, addonConfigs, appSettings] = await Promise.all([
    prisma.club.findMany({
      take: scope === "DATABASE_ONLY" ? 500 : 500,
      select: { id: true, name: true, slug: true, city: true, country: true, isActive: true },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
    }),
    prisma.planConfig.findMany(),
    prisma.addonConfig.findMany(),
    prisma.appSettings.findUnique({ where: { id: "global" } }),
  ]);
  return { clubs, users, planConfigs, addonConfigs, appSettings, exportedAt: new Date().toISOString() };
}

export async function createClubBackup(scope: BackupScope) {
  const feature = await requireFeature("clubBackupEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const job = await prisma.clubBackup.create({
    data: {
      clubId: ctx.clubId,
      scope,
      status: "PENDING",
      createdById: ctx.userId,
    },
  });

  try {
    const payload = await exportClubData(ctx.clubId, scope);
    const json = JSON.stringify(payload, null, 2);
    const fileName = `club-backup-${ctx.club.slug}-${scope.toLowerCase()}-${Date.now()}.json`;

    await prisma.clubBackup.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        payload: json,
        fileName,
        sizeBytes: Buffer.byteLength(json, "utf8"),
        completedAt: new Date(),
      },
    });

    revalidatePath(`/${ctx.club.language === "EN" ? "en" : "fr"}/settings`);
    return { success: true as const, backupId: job.id, fileName };
  } catch (e) {
    await prisma.clubBackup.update({
      where: { id: job.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    return { error: "BACKUP_FAILED" as const, detail: e instanceof Error ? e.message : "" };
  }
}

export async function downloadClubBackup(backupId: string) {
  const feature = await requireFeature("clubBackupEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const backup = await prisma.clubBackup.findFirst({
    where: { id: backupId, clubId: ctx.clubId, status: "COMPLETED" },
  });
  if (!backup?.payload) return { error: "NOT_FOUND" as const };

  return {
    success: true as const,
    fileName: backup.fileName ?? `backup-${backupId}.json`,
    content: backup.payload,
  };
}

export async function listClubBackups() {
  const feature = await requireFeature("clubBackupEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.view");
  if (auth.error) return auth;
  const { ctx } = auth;

  const backups = await prisma.clubBackup.findMany({
    where: { clubId: ctx.clubId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      scope: true,
      status: true,
      fileName: true,
      sizeBytes: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return {
    backups: backups.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function createPlatformBackup(scope: BackupScope, locale: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return { error: "UNAUTHORIZED" as const };
  const user = session.user;

  const job = await prisma.platformBackup.create({
    data: { scope, status: "PENDING", createdById: user.id },
  });

  try {
    const payload = await exportPlatformData(scope);
    const json = JSON.stringify(payload, null, 2);
    const fileName = `platform-backup-${scope.toLowerCase()}-${Date.now()}.json`;

    await prisma.platformBackup.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        payload: json,
        fileName,
        sizeBytes: Buffer.byteLength(json, "utf8"),
        completedAt: new Date(),
      },
    });

    revalidatePath(`/${locale}/admin/settings`);
    return { success: true as const, backupId: job.id, fileName };
  } catch (e) {
    await prisma.platformBackup.update({
      where: { id: job.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    return { error: "BACKUP_FAILED" as const };
  }
}

export async function downloadPlatformBackup(backupId: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  const backup = await prisma.platformBackup.findFirst({
    where: { id: backupId, status: "COMPLETED" },
  });
  if (!backup?.payload) return { error: "NOT_FOUND" as const };

  return {
    success: true as const,
    fileName: backup.fileName ?? `platform-${backupId}.json`,
    content: backup.payload,
  };
}