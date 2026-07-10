"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import {
  bufferToDocumentDataUrl,
  fileToDocumentDataUrl,
  validateDocumentDataUrl,
} from "@/lib/document-storage";
import {
  treasuryVoucherDownloadUrl,
  treasuryVoucherViewUrl,
} from "@/lib/treasury-voucher-urls";
import { validateUploadFileSize, validateUploadFiles } from "@/lib/upload-limits";
import type { TreasuryVoucherKind } from "@/generated/prisma/client";

export type TreasuryVoucherEntity =
  | { type: "budgetEntry"; id: string }
  | { type: "duesPayment"; id: string }
  | { type: "eventRegistration"; id: string };

function revalidateTreasuryVouchers() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/treasury`);
    revalidatePath(`/${loc}/members/dues`);
  }
}

async function requireTreasuryView() {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "treasury.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireVoucherView(entity: TreasuryVoucherEntity) {
  if (entity.type === "duesPayment") {
    const duesFeature = await requireFeature("duesEnabled");
    if (!duesFeature.error) {
      const { ctx } = duesFeature;
      if (ctx.isSuperAdmin) return { ctx };
      const allowed = await hasRolePermission(ctx.role, "dues.view", false);
      if (allowed) return { ctx };
    }
  }
  return requireTreasuryView();
}

async function requireTreasuryManage() {
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  return auth;
}

async function requireVoucherManage(entity?: TreasuryVoucherEntity) {
  if (entity?.type === "duesPayment") {
    const duesFeature = await requireFeature("duesEnabled");
    if (!duesFeature.error) {
      const duesAuth = await requirePermission("dues.manage");
      if (!duesAuth.error) return duesAuth;
    }
  }
  return requireTreasuryManage();
}

async function assertEntityBelongsToClub(entity: TreasuryVoucherEntity, clubId: string) {
  if (entity.type === "budgetEntry") {
    const row = await prisma.budgetEntry.findFirst({
      where: { id: entity.id, clubId },
      select: { id: true },
    });
    return !!row;
  }
  if (entity.type === "duesPayment") {
    const row = await prisma.duesPayment.findFirst({
      where: { id: entity.id, clubId },
      select: { id: true },
    });
    return !!row;
  }
  const row = await prisma.eventRegistration.findFirst({
    where: { id: entity.id, event: { clubId } },
    select: { id: true },
  });
  return !!row;
}

function entityLinkData(entity: TreasuryVoucherEntity) {
  if (entity.type === "budgetEntry") {
    return { budgetEntryId: entity.id, duesPaymentId: null, eventRegistrationId: null };
  }
  if (entity.type === "duesPayment") {
    return { budgetEntryId: null, duesPaymentId: entity.id, eventRegistrationId: null };
  }
  return { budgetEntryId: null, duesPaymentId: null, eventRegistrationId: entity.id };
}

function mapVoucherRow(v: {
  id: string;
  kind: TreasuryVoucherKind;
  label: string | null;
  fileName: string;
  mimeType: string;
  createdAt: Date;
}) {
  return {
    id: v.id,
    kind: v.kind,
    label: v.label,
    fileName: v.fileName,
    mimeType: v.mimeType,
    viewUrl: treasuryVoucherViewUrl(v.id, v.mimeType),
    downloadUrl: treasuryVoucherDownloadUrl(v.id),
    createdAt: v.createdAt.toISOString(),
  };
}

export async function listTreasuryVouchers(entity: TreasuryVoucherEntity) {
  const auth = await requireVoucherView(entity);
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const belongs = await assertEntityBelongsToClub(entity, ctx.clubId);
  if (!belongs) return { error: "NOT_FOUND" as const };

  const link = entityLinkData(entity);
  const vouchers = await prisma.treasuryVoucher.findMany({
    where: { clubId: ctx.clubId, ...link },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      label: true,
      fileName: true,
      mimeType: true,
      createdAt: true,
    },
  });

  return { vouchers: vouchers.map(mapVoucherRow) };
}

export async function uploadTreasuryVoucher(data: {
  entity: TreasuryVoucherEntity;
  kind?: TreasuryVoucherKind;
  label?: string;
  fileDataUrl: string;
  fileName: string;
  mimeType: string;
}) {
  const auth = await requireVoucherManage(data.entity);
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const belongs = await assertEntityBelongsToClub(data.entity, ctx.clubId);
  if (!belongs) return { error: "NOT_FOUND" as const };

  const validationError = validateDocumentDataUrl(data.fileDataUrl);
  if (validationError) return { error: validationError };

  const voucher = await prisma.treasuryVoucher.create({
    data: {
      clubId: ctx.clubId,
      kind: data.kind ?? "OTHER",
      label: data.label?.trim() || null,
      fileUrl: data.fileDataUrl,
      fileName: data.fileName,
      mimeType: data.mimeType,
      ...entityLinkData(data.entity),
      uploadedById: ctx.userId,
    },
    select: {
      id: true,
      kind: true,
      label: true,
      fileName: true,
      mimeType: true,
      createdAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "TREASURY_VOUCHER_UPLOADED",
      entity: "TreasuryVoucher",
      entityId: voucher.id,
      metadata: {
        fileName: data.fileName,
        kind: data.kind ?? "OTHER",
        ...entityLinkData(data.entity),
      },
    },
  });

  revalidateTreasuryVouchers();
  return { success: true as const, voucher: mapVoucherRow(voucher) };
}

function parseVoucherEntity(
  entityType: TreasuryVoucherEntity["type"] | null,
  entityId: string | null
): TreasuryVoucherEntity | null {
  if (!entityType || !entityId) return null;
  if (entityType === "budgetEntry") return { type: "budgetEntry", id: entityId };
  if (entityType === "duesPayment") return { type: "duesPayment", id: entityId };
  return { type: "eventRegistration", id: entityId };
}

export async function uploadTreasuryVoucherFile(formData: FormData) {
  const entityType = formData.get("entityType") as TreasuryVoucherEntity["type"] | null;
  const entityId = (formData.get("entityId") as string)?.trim() || null;
  const entity = parseVoucherEntity(entityType, entityId);
  if (!entity) return { error: "MISSING_FIELDS" as const };

  const auth = await requireVoucherManage(entity);
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const kind = (formData.get("kind") as TreasuryVoucherKind) || "OTHER";
  const label = (formData.get("label") as string)?.trim();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "NO_FILE" as const };

  const sizeError = validateUploadFileSize(file.size);
  if (sizeError) return { error: sizeError };

  try {
    const { dataUrl, mimeType } = await fileToDocumentDataUrl(file);
    return uploadTreasuryVoucher({
      entity,
      kind,
      label,
      fileDataUrl: dataUrl,
      fileName: file.name,
      mimeType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
  }
}

export async function uploadTreasuryVoucherFiles(formData: FormData) {
  const entityType = formData.get("entityType") as TreasuryVoucherEntity["type"] | null;
  const entityId = (formData.get("entityId") as string)?.trim() || null;
  const entity = parseVoucherEntity(entityType, entityId);
  if (!entity) return { error: "MISSING_FIELDS" as const };

  const auth = await requireVoucherManage(entity);
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const kind = (formData.get("kind") as TreasuryVoucherKind) || "OTHER";
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const batchError = validateUploadFiles(files);
  if (batchError) return { error: batchError };

  const uploaded: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { dataUrl, mimeType } = bufferToDocumentDataUrl(buffer, file.name, file.type);
      const result = await uploadTreasuryVoucher({
        entity,
        kind,
        fileDataUrl: dataUrl,
        fileName: file.name,
        mimeType,
      });
      if ("success" in result && result.success) {
        uploaded.push(result.voucher.id);
      } else {
        failed.push(file.name);
      }
    } catch {
      failed.push(file.name);
    }
  }

  if (uploaded.length === 0) return { error: "UPLOAD_FAILED" as const };

  return { success: true as const, uploaded: uploaded.length, voucherIds: uploaded, failed };
}

export async function deleteTreasuryVoucher(voucherId: string) {
  const existing = await prisma.treasuryVoucher.findFirst({
    where: { id: voucherId },
    select: {
      id: true,
      clubId: true,
      duesPaymentId: true,
      budgetEntryId: true,
      eventRegistrationId: true,
    },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  const entity: TreasuryVoucherEntity | null = existing.duesPaymentId
    ? { type: "duesPayment", id: existing.duesPaymentId }
    : existing.eventRegistrationId
      ? { type: "eventRegistration", id: existing.eventRegistrationId }
      : existing.budgetEntryId
        ? { type: "budgetEntry", id: existing.budgetEntryId }
        : null;
  if (!entity) return { error: "NOT_FOUND" as const };

  const auth = await requireVoucherManage(entity);
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  if (existing.clubId !== ctx.clubId) return { error: "NOT_FOUND" as const };

  await prisma.treasuryVoucher.delete({ where: { id: voucherId } });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "TREASURY_VOUCHER_DELETED",
      entity: "TreasuryVoucher",
      entityId: voucherId,
    },
  });

  revalidateTreasuryVouchers();
  return { success: true as const };
}