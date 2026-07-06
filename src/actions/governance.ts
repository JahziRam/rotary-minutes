"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { requireFeature } from "@/lib/require-feature";
import type { GovernanceRecordType } from "@/generated/prisma/client";

function revalidateGovernance() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/governance`);
    revalidatePath(`/${loc}/members`);
  }
}

export async function listGovernanceRecords(opts?: { limit?: number }) {
  const feature = await requireFeature("governanceEnabled");
  if (feature.error) return { error: feature.error as string };
  const auth = await requirePermission("governance.view");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const records = await prisma.governanceRecord.findMany({
    where: { clubId: ctx.clubId },
    include: {
      minute: { select: { id: true, title: true, status: true } },
      mandate: { select: { id: true, role: true, holderName: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { effectiveAt: "desc" },
    take: opts?.limit ?? 200,
  });

  return {
    records: records.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      holderName: r.holderName,
      memberId: r.memberId,
      minuteId: r.minuteId,
      mandateId: r.mandateId,
      effectiveAt: r.effectiveAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      minute: r.minute,
      mandate: r.mandate,
      createdByName: r.createdBy
        ? `${r.createdBy.firstName} ${r.createdBy.lastName}`
        : null,
    })),
  };
}

export async function createRecord(data: {
  type: "MANDATE_START" | "COLLAR_TRANSFER" | "OFFICER_CHANGE";
  title: string;
  description?: string;
  holderName?: string;
  memberId?: string;
  mandateId?: string;
  effectiveAt: string;
}) {
  const feature = await requireFeature("governanceEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("governance.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const record = await prisma.governanceRecord.create({
    data: {
      clubId: ctx.clubId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      holderName: data.holderName || null,
      memberId: data.memberId || null,
      mandateId: data.mandateId || null,
      effectiveAt: new Date(data.effectiveAt),
      createdById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "GOVERNANCE_RECORD_CREATED",
      entity: "GovernanceRecord",
      entityId: record.id,
      metadata: { type: data.type, title: data.title },
    },
  });

  revalidateGovernance();
  return { success: true, id: record.id };
}

export async function syncFromMinuteWorkflow(
  minuteId: string,
  event: "submit" | "approve" | "finalize",
  userId?: string
) {
  const minute = await prisma.minute.findUnique({
    where: { id: minuteId },
    include: { club: { select: { id: true, name: true } } },
  });
  if (!minute) return;

  const features = await import("@/lib/features").then((m) =>
    m.getClubFeatures(minute.clubId)
  );
  if (!features.governanceEnabled) return;

  const typeMap: Record<typeof event, GovernanceRecordType> = {
    submit: "MINUTE_SUBMITTED",
    approve: "MINUTE_APPROVED",
    finalize: "MINUTE_FINALIZED",
  };

  const titleMap: Record<typeof event, { fr: string; en: string }> = {
    submit: {
      fr: `PV soumis pour validation — ${minute.title}`,
      en: `Minutes submitted for review — ${minute.title}`,
    },
    approve: {
      fr: `PV approuvé — ${minute.title}`,
      en: `Minutes approved — ${minute.title}`,
    },
    finalize: {
      fr: `PV finalisé — ${minute.title}`,
      en: `Minutes finalized — ${minute.title}`,
    },
  };

  const club = await prisma.club.findUnique({
    where: { id: minute.clubId },
    select: { language: true },
  });
  const loc = club?.language === "EN" ? "en" : "fr";

  await prisma.governanceRecord.create({
    data: {
      clubId: minute.clubId,
      type: typeMap[event],
      title: titleMap[event][loc],
      description: null,
      minuteId: minute.id,
      effectiveAt: new Date(),
      createdById: userId ?? null,
    },
  });

  revalidateGovernance();
}

export async function syncMandateRecord(
  mandateId: string,
  event: "start" | "end",
  userId?: string
) {
  const mandate = await prisma.officerMandate.findUnique({
    where: { id: mandateId },
    include: { club: { select: { id: true, language: true } } },
  });
  if (!mandate) return;

  const features = await import("@/lib/features").then((m) =>
    m.getClubFeatures(mandate.clubId)
  );
  if (!features.governanceEnabled) return;

  const loc = mandate.club.language === "EN" ? "en" : "fr";
  const type = event === "start" ? "MANDATE_START" : "MANDATE_END";
  const title =
    event === "start"
      ? loc === "fr"
        ? `Prise de fonction — ${mandate.role} (${mandate.holderName})`
        : `Officer term started — ${mandate.role} (${mandate.holderName})`
      : loc === "fr"
        ? `Fin de mandat — ${mandate.role} (${mandate.holderName})`
        : `Officer term ended — ${mandate.role} (${mandate.holderName})`;

  await prisma.governanceRecord.create({
    data: {
      clubId: mandate.clubId,
      type,
      title,
      holderName: mandate.holderName,
      memberId: mandate.memberId,
      mandateId: mandate.id,
      effectiveAt: event === "start" ? mandate.startDate : mandate.endDate,
      createdById: userId ?? null,
    },
  });

  revalidateGovernance();
}