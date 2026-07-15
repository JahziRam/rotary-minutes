"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import {
  bufferToDocumentDataUrl,
  fileToDocumentDataUrl,
} from "@/lib/document-storage";
import { documentDownloadUrl, documentViewUrl } from "@/lib/document-urls";
import { getDocumentViewKind } from "@/lib/document-types";
import {
  assertMinuteAccess,
  loadMinuteForContext,
} from "@/lib/commission-scope";
import {
  MINUTE_ATTACHMENT_TAG,
  isMinuteUserAttachment,
  titleFromFileName,
} from "@/lib/minute-attachments";
import { hasRolePermission } from "@/lib/roles";
import { validateUploadFileSize, validateUploadFiles } from "@/lib/upload-limits";

function revalidateMinuteAttachmentPaths(minuteId: string) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/minutes/${minuteId}`);
    revalidatePath(`/${loc}/minutes/${minuteId}/edit`);
  }
}

function mapAttachmentRow(doc: {
  id: string;
  title: string;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  createdAt: Date;
  uploadedBy: { firstName: string; lastName: string } | null;
}) {
  return {
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    viewUrl: documentViewUrl(doc.id, doc.fileUrl, doc.mimeType),
    downloadUrl: documentDownloadUrl(doc.id, doc.fileUrl),
    viewKind: getDocumentViewKind(doc.mimeType, doc.fileUrl),
    createdAt: doc.createdAt.toISOString(),
    uploadedByName: doc.uploadedBy
      ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
      : null,
  };
}

async function loadMinuteForAttachments(
  minuteId: string,
  permission: "minutes.view" | "minutes.edit"
) {
  const auth = await requirePermission(permission);
  if (auth.error) return auth;
  const { ctx } = auth;

  const minute = await loadMinuteForContext(ctx, minuteId);
  if (!minute) return { error: "NOT_FOUND" as const };

  const access = await assertMinuteAccess(ctx, minute);
  if ("error" in access) return { error: access.error };

  return { ctx, minute };
}

export async function listMinuteAttachments(minuteId: string) {
  const loaded = await loadMinuteForAttachments(minuteId, "minutes.view");
  if ("error" in loaded) return loaded;
  const { ctx, minute } = loaded;

  const attachments = await prisma.clubDocument.findMany({
    where: {
      clubId: ctx.clubId,
      minuteId,
      isArchived: false,
      tags: { has: MINUTE_ATTACHMENT_TAG },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
      createdAt: true,
      uploadedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const canManage =
    minute.status !== "ARCHIVED" &&
    (await hasRolePermission(ctx.role, "minutes.edit", ctx.isSuperAdmin));

  return {
    attachments: attachments.map(mapAttachmentRow),
    canManage,
  };
}

export async function uploadMinuteAttachmentFromBuffer(
  minuteId: string,
  data: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    title?: string;
  }
) {
  const loaded = await loadMinuteForAttachments(minuteId, "minutes.edit");
  if ("error" in loaded) return loaded;
  const { ctx, minute } = loaded;

  if (minute.status === "ARCHIVED") {
    return { error: "INVALID_STATUS" as const };
  }

  const sizeError = validateUploadFileSize(data.buffer.byteLength);
  if (sizeError) return { error: sizeError };

  try {
    const { dataUrl, mimeType } = bufferToDocumentDataUrl(
      data.buffer,
      data.fileName,
      data.mimeType
    );

    const doc = await prisma.clubDocument.create({
      data: {
        clubId: ctx.clubId,
        minuteId,
        title: data.title?.trim() || titleFromFileName(data.fileName),
        category: "OTHER",
        description: null,
        fileUrl: dataUrl,
        fileName: data.fileName,
        mimeType,
        tags: [MINUTE_ATTACHMENT_TAG, "minute"],
        uploadedById: ctx.userId,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        clubId: ctx.clubId,
        userId: ctx.userId,
        action: "MINUTE_ATTACHMENT_UPLOADED",
        entity: "ClubDocument",
        entityId: doc.id,
        metadata: { minuteId, fileName: data.fileName },
      },
    });

    revalidateMinuteAttachmentPaths(minuteId);
    return { success: true as const, attachment: mapAttachmentRow(doc) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg as "UPLOAD_FAILED" };
  }
}

export async function uploadMinuteAttachmentFile(minuteId: string, formData: FormData) {
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const batchError = validateUploadFiles(files);
  if (batchError) return { error: batchError };

  const uploaded = [];
  const failed: string[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { mimeType } = await fileToDocumentDataUrl(file);
      const result = await uploadMinuteAttachmentFromBuffer(minuteId, {
        buffer,
        fileName: file.name,
        mimeType,
      });
      if ("success" in result && result.success) {
        uploaded.push(result.attachment);
      } else {
        failed.push(file.name);
      }
    } catch {
      failed.push(file.name);
    }
  }

  if (uploaded.length === 0) {
    return { error: "UPLOAD_FAILED" as const };
  }

  return { success: true as const, uploaded, failed };
}

export async function deleteMinuteAttachment(attachmentId: string) {
  const auth = await requirePermission("minutes.edit");
  if (auth.error) return auth;
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: {
      id: attachmentId,
      clubId: ctx.clubId,
      isArchived: false,
    },
    include: {
      minute: {
        select: {
          id: true,
          status: true,
          meeting: { select: { type: true, commissionId: true } },
        },
      },
    },
  });

  if (!doc?.minuteId || !doc.minute) {
    return { error: "NOT_FOUND" as const };
  }

  if (!isMinuteUserAttachment(doc)) {
    return { error: "NOT_FOUND" as const };
  }

  const access = await assertMinuteAccess(ctx, doc.minute);
  if ("error" in access) return { error: access.error };

  if (doc.minute.status === "ARCHIVED") {
    return { error: "INVALID_STATUS" as const };
  }

  await prisma.clubDocument.delete({ where: { id: attachmentId } });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "MINUTE_ATTACHMENT_DELETED",
      entity: "ClubDocument",
      entityId: attachmentId,
      metadata: { minuteId: doc.minuteId, fileName: doc.fileName },
    },
  });

  revalidateMinuteAttachmentPaths(doc.minuteId);
  return { success: true as const };
}

export async function loadMinuteAttachmentBuffers(minuteId: string, clubId: string) {
  const docs = await prisma.clubDocument.findMany({
    where: {
      clubId,
      minuteId,
      isArchived: false,
      tags: { has: MINUTE_ATTACHMENT_TAG },
    },
    select: {
      fileUrl: true,
      fileName: true,
      mimeType: true,
      title: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const { decodeStoredDocumentBuffer } = await import("@/lib/minute-attachments");
  const attachments: Array<{ filename: string; content: Buffer }> = [];

  for (const doc of docs) {
    if (!doc.fileUrl) continue;
    const buffer = decodeStoredDocumentBuffer(doc.fileUrl);
    if (!buffer) continue;
    attachments.push({
      filename: doc.fileName ?? `${doc.title}.bin`,
      content: buffer,
    });
  }

  return attachments;
}