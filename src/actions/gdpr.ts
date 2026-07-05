"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";

async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  );
}

export async function requestDataExport() {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" as const };

  const ctx = await getClubContext();
  const userId = session.user.id;

  const existing = await prisma.dataExportRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (existing) return { error: "ALREADY_PENDING" as const };

  const request = await prisma.dataExportRequest.create({
    data: {
      userId,
      clubId: ctx?.clubId ?? null,
      status: "PROCESSING",
    },
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            club: { select: { id: true, name: true, slug: true } },
          },
        },
        consentRecords: { orderBy: { createdAt: "desc" }, take: 50 },
        notifications: { orderBy: { createdAt: "desc" }, take: 100 },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    });

    if (!user) {
      await prisma.dataExportRequest.update({
        where: { id: request.id },
        data: { status: "FAILED" },
      });
      return { error: "NOT_FOUND" as const };
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        language: user.language,
        createdAt: user.createdAt,
      },
      memberships: user.memberships.map((m) => ({
        clubId: m.clubId,
        clubName: m.club.name,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      consents: user.consentRecords,
      notifications: user.notifications.map((n) => ({
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
      })),
      auditActivity: user.auditLogs.map((l) => ({
        action: l.action,
        entity: l.entity,
        createdAt: l.createdAt,
      })),
    };

    await prisma.dataExportRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        clubId: ctx?.clubId,
        userId,
        action: "DATA_EXPORT_REQUESTED",
        entity: "DataExportRequest",
        entityId: request.id,
      },
    });

    for (const loc of ["fr", "en"]) {
      revalidatePath(`/${loc}/settings`);
    }

    return { success: true as const, requestId: request.id, data: exportData };
  } catch {
    await prisma.dataExportRequest.update({
      where: { id: request.id },
      data: { status: "FAILED" },
    });
    return { error: "EXPORT_FAILED" as const };
  }
}

export async function requestAccountDeletion(reason?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" as const };

  const userId = session.user.id;
  const ctx = await getClubContext();

  const existing = await prisma.deletionRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (existing) return { error: "ALREADY_PENDING" as const };

  const request = await prisma.deletionRequest.create({
    data: {
      userId,
      reason: reason?.trim() || null,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx?.clubId,
      userId,
      action: "DELETION_REQUESTED",
      entity: "DeletionRequest",
      entityId: request.id,
      metadata: { reason: reason ?? null },
    },
  });

  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings`);
  }

  return { success: true as const, requestId: request.id };
}

export async function recordConsent(type: string, granted: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "UNAUTHORIZED" as const };

  const ipAddress = await getClientIp();

  await prisma.consentRecord.create({
    data: {
      userId: session.user.id,
      type,
      granted,
      ipAddress,
    },
  });

  return { success: true as const };
}

export async function getGdprRequests() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [exports, deletions] = await Promise.all([
    prisma.dataExportRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.deletionRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { exports, deletions };
}