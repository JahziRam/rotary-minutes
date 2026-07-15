"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { randomBytes } from "node:crypto";
import {
  bufferToDocumentDataUrl,
  fileToDocumentDataUrl,
  validateDocumentDataUrl,
} from "@/lib/document-storage";
import { documentDownloadUrl, documentViewUrl } from "@/lib/document-urls";
import { getDocumentViewKind } from "@/lib/document-types";
import { validateUploadFileSize, validateUploadFiles } from "@/lib/upload-limits";
import { getClubFeatures } from "@/lib/features";
import type { DocumentCategory } from "@/generated/prisma/client";

function revalidateDocuments() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/documents`);
    revalidatePath(`/${loc}/my-account`);
  }
}

async function requireDocumentsView() {
  const feature = await requireFeature("documentsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "documents.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireDocumentsManage() {
  const feature = await requireFeature("documentsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("documents.manage");
  if (auth.error) return auth;
  return auth;
}

const documentSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  fileUrl: true,
  fileName: true,
  mimeType: true,
  minuteId: true,
  folderId: true,
  isArchived: true,
  isShareEnabled: true,
  shareToken: true,
  shareExpiresAt: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { firstName: true, lastName: true } },
} as const;

function mapDocumentRow(d: {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  minuteId: string | null;
  folderId: string | null;
  isArchived: boolean;
  isShareEnabled: boolean;
  shareToken: string | null;
  shareExpiresAt: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: { firstName: string; lastName: string } | null;
}) {
  const rawFileUrl = d.fileUrl;
  return {
    ...d,
    fileUrl: documentViewUrl(d.id, rawFileUrl, d.mimeType),
    downloadUrl: documentDownloadUrl(d.id, rawFileUrl),
    viewKind: getDocumentViewKind(d.mimeType, rawFileUrl),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    shareExpiresAt: d.shareExpiresAt?.toISOString() ?? null,
    uploadedByName: d.uploadedBy
      ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`
      : null,
  };
}

export async function listDocumentFolders() {
  const auth = await requireDocumentsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  if (!features.fileManagerEnabled) return { folders: [] };

  const folders = await prisma.documentFolder.findMany({
    where: { clubId: ctx.clubId },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      sortOrder: true,
      _count: { select: { documents: true, children: true } },
    },
  });

  return {
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      sortOrder: f.sortOrder,
      documentCount: f._count.documents,
      childCount: f._count.children,
    })),
  };
}

export async function createDocumentFolder(data: { name: string; parentId?: string }) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  if (!features.fileManagerEnabled) return { error: "FEATURE_DISABLED" as const };

  const name = data.name.trim();
  if (!name) return { error: "INVALID_NAME" as const };

  const folder = await prisma.documentFolder.create({
    data: {
      clubId: ctx.clubId,
      name,
      parentId: data.parentId || null,
    },
  });

  revalidateDocuments();
  return { success: true as const, folderId: folder.id };
}

export async function renameDocumentFolder(folderId: string, name: string) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const existing = await prisma.documentFolder.findFirst({
    where: { id: folderId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.documentFolder.update({
    where: { id: folderId },
    data: { name: name.trim() },
  });

  revalidateDocuments();
  return { success: true as const };
}

export async function deleteDocumentFolder(folderId: string) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const existing = await prisma.documentFolder.findFirst({
    where: { id: folderId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubDocument.updateMany({
    where: { folderId },
    data: { folderId: null },
  });
  await prisma.documentFolder.delete({ where: { id: folderId } });

  revalidateDocuments();
  return { success: true as const };
}

export async function moveDocumentToFolder(documentId: string, folderId: string | null) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

  if (folderId) {
    const folder = await prisma.documentFolder.findFirst({
      where: { id: folderId, clubId: ctx.clubId },
    });
    if (!folder) return { error: "NOT_FOUND" as const };
  }

  await prisma.clubDocument.update({
    where: { id: documentId },
    data: { folderId },
  });

  revalidateDocuments();
  return { success: true as const };
}

export async function listDocuments(filters?: {
  category?: DocumentCategory;
  includeArchived?: boolean;
  folderId?: string | null;
}) {
  const auth = await requireDocumentsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);

  const documents = await prisma.clubDocument.findMany({
    where: {
      clubId: ctx.clubId,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.includeArchived ? {} : { isArchived: false }),
      ...(filters?.folderId !== undefined ? { folderId: filters.folderId } : {}),
    },
    select: documentSelect,
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const canManage = await hasRolePermission(ctx.role, "documents.manage", ctx.isSuperAdmin);

  const foldersResult =
    features.fileManagerEnabled ? await listDocumentFolders() : { folders: [] };

  return {
    documents: documents.map(mapDocumentRow),
    folders: "folders" in foldersResult ? foldersResult.folders : [],
    fileManagerEnabled: features.fileManagerEnabled,
    documentSharingEnabled: features.documentSharingEnabled,
    canManage,
  };
}

export async function searchDocuments(query: string, category?: DocumentCategory) {
  const auth = await requireDocumentsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const q = query.trim();
  const documents = await prisma.clubDocument.findMany({
    where: {
      clubId: ctx.clubId,
      isArchived: false,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { fileName: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    select: documentSelect,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canManage = await hasRolePermission(ctx.role, "documents.manage", ctx.isSuperAdmin);

  return {
    documents: documents.map(mapDocumentRow),
    canManage,
  };
}

export async function enableDocumentShare(documentId: string, expiresInDays?: number) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  if (!features.documentSharingEnabled) return { error: "FEATURE_DISABLED" as const };

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId, isArchived: false },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

  const shareToken = randomBytes(24).toString("hex");
  const shareExpiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await prisma.clubDocument.update({
    where: { id: documentId },
    data: { isShareEnabled: true, shareToken, shareExpiresAt },
  });

  revalidateDocuments();
  return { success: true as const, shareToken };
}

export async function disableDocumentShare(documentId: string) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

  await prisma.clubDocument.update({
    where: { id: documentId },
    data: { isShareEnabled: false, shareToken: null, shareExpiresAt: null },
  });

  revalidateDocuments();
  return { success: true as const };
}

export async function getSharedDocument(shareToken: string) {
  const doc = await prisma.clubDocument.findFirst({
    where: {
      shareToken,
      isShareEnabled: true,
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
      shareExpiresAt: true,
      club: { select: { name: true } },
    },
  });
  if (!doc) return { error: "NOT_FOUND" as const };
  if (doc.shareExpiresAt && doc.shareExpiresAt < new Date()) {
    return { error: "EXPIRED" as const };
  }

  return {
    success: true as const,
    document: {
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      clubName: doc.club.name,
    },
  };
}

export async function fetchDocumentRows(filters?: {
  category?: DocumentCategory;
  includeArchived?: boolean;
  folderId?: string | null;
}) {
  const auth = await requireDocumentsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const documents = await prisma.clubDocument.findMany({
    where: {
      clubId: ctx.clubId,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.includeArchived ? {} : { isArchived: false }),
      ...(filters?.folderId !== undefined ? { folderId: filters.folderId } : {}),
    },
    select: documentSelect,
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return { documents: documents.map(mapDocumentRow) };
}

export async function uploadDocumentFromBuffer(data: {
  title: string;
  category: DocumentCategory;
  description?: string;
  tags?: string[];
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };

  try {
    const { dataUrl, mimeType } = bufferToDocumentDataUrl(
      data.buffer,
      data.fileName,
      data.mimeType
    );
    return uploadDocument({
      title: data.title,
      category: data.category,
      description: data.description,
      tags: data.tags,
      fileDataUrl: dataUrl,
      fileName: data.fileName,
      mimeType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
  }
}

export async function uploadDocument(data: {
  title: string;
  category: DocumentCategory;
  description?: string;
  tags?: string[];
  fileDataUrl: string;
  fileName: string;
  mimeType: string;
}) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const validationError = validateDocumentDataUrl(data.fileDataUrl);
  if (validationError) return { error: validationError };

  const doc = await prisma.clubDocument.create({
    data: {
      clubId: ctx.clubId,
      title: data.title.trim(),
      category: data.category,
      description: data.description?.trim() || null,
      fileUrl: data.fileDataUrl,
      fileName: data.fileName,
      mimeType: data.mimeType,
      tags: data.tags ?? [],
      uploadedById: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "DOCUMENT_UPLOADED",
      entity: "ClubDocument",
      entityId: doc.id,
      metadata: { title: doc.title, category: doc.category },
    },
  });

  revalidateDocuments();
  return { success: true as const, documentId: doc.id };
}

export async function uploadDocumentFile(formData: FormData) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const title = (formData.get("title") as string)?.trim();
  const category = formData.get("category") as DocumentCategory;
  const description = (formData.get("description") as string)?.trim();
  const tagsRaw = (formData.get("tags") as string)?.trim();
  const file = formData.get("file");

  if (!title || !category) return { error: "MISSING_FIELDS" as const };
  if (!(file instanceof File) || file.size === 0) return { error: "NO_FILE" as const };

  const sizeError = validateUploadFileSize(file.size);
  if (sizeError) return { error: sizeError };

  try {
    const { dataUrl, mimeType } = await fileToDocumentDataUrl(file);
    return uploadDocument({
      title,
      category,
      description,
      tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
      fileDataUrl: dataUrl,
      fileName: file.name,
      mimeType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
  }
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base || fileName;
}

export async function uploadDocumentFiles(formData: FormData) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const category = formData.get("category") as DocumentCategory;
  const description = (formData.get("description") as string)?.trim();
  const tagsRaw = (formData.get("tags") as string)?.trim();
  const titleSingle = (formData.get("title") as string)?.trim();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!category) return { error: "MISSING_FIELDS" as const };

  const batchError = validateUploadFiles(files);
  if (batchError) return { error: batchError };

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const documentIds: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const title = titleSingle || titleFromFileName(file.name);

    try {
      const { dataUrl, mimeType } = await fileToDocumentDataUrl(file);
      const result = await uploadDocument({
        title,
        category,
        description,
        tags,
        fileDataUrl: dataUrl,
        fileName: file.name,
        mimeType,
      });
      if ("success" in result && result.success) {
        documentIds.push(result.documentId);
      } else {
        failed.push(file.name);
      }
    } catch {
      failed.push(file.name);
    }
  }

  if (documentIds.length === 0) {
    return { error: "UPLOAD_FAILED" as const };
  }

  return {
    success: true as const,
    uploaded: documentIds.length,
    documentIds,
    failed,
  };
}

export async function updateDocument(
  documentId: string,
  data: {
    title?: string;
    category?: DocumentCategory;
    description?: string | null;
    tags?: string[];
    folderId?: string | null;
  }
) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId, isArchived: false },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

  const { isMinuteArchivePdfLink } = await import("@/lib/minute-attachments");
  if (isMinuteArchivePdfLink(doc)) {
    if (data.category !== undefined && data.category !== "MINUTE") {
      return { error: "LINKED_MINUTE" as const };
    }
  }

  const features = await getClubFeatures(ctx.clubId);

  if (data.folderId !== undefined) {
    if (!features.fileManagerEnabled) return { error: "FEATURE_DISABLED" as const };
    if (data.folderId) {
      const folder = await prisma.documentFolder.findFirst({
        where: { id: data.folderId, clubId: ctx.clubId },
      });
      if (!folder) return { error: "NOT_FOUND" as const };
    }
  }

  const title = data.title?.trim();
  if (data.title !== undefined && !title) return { error: "INVALID_TITLE" as const };

  const updateData: {
    title?: string;
    category?: DocumentCategory;
    description?: string | null;
    tags?: string[];
    folderId?: string | null;
  } = {};

  if (title) updateData.title = title;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.folderId !== undefined) updateData.folderId = data.folderId;

  if (Object.keys(updateData).length === 0) {
    return { error: "NO_CHANGES" as const };
  }

  const updated = await prisma.clubDocument.update({
    where: { id: documentId },
    data: updateData,
    select: documentSelect,
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "DOCUMENT_UPDATED",
      entity: "ClubDocument",
      entityId: documentId,
      metadata: updateData,
    },
  });

  revalidateDocuments();
  return { success: true as const, document: mapDocumentRow(updated) };
}

export async function archiveDocument(documentId: string) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId },
  });
  if (!doc) return { error: "NOT_FOUND" as const };
  const { isMinuteArchivePdfLink } = await import("@/lib/minute-attachments");
  if (isMinuteArchivePdfLink(doc)) return { error: "LINKED_MINUTE" as const };

  await prisma.clubDocument.update({
    where: { id: documentId },
    data: { isArchived: true },
  });

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "DOCUMENT_ARCHIVED",
      entity: "ClubDocument",
      entityId: documentId,
    },
  });

  revalidateDocuments();
  return { success: true as const };
}

/** Called from minutes finalize — links archived minute as a document. */
export async function linkMinuteAsDocument(
  minuteId: string,
  clubId: string,
  userId: string,
  title: string
) {
  const existing = await prisma.clubDocument.findFirst({
    where: { minuteId, clubId },
  });
  if (existing) return existing.id;

  const doc = await prisma.clubDocument.create({
    data: {
      clubId,
      minuteId,
      title,
      category: "MINUTE",
      description: "Procès-verbal finalisé",
      fileUrl: `/api/pdf/${minuteId}`,
      fileName: `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim()}.pdf`,
      mimeType: "application/pdf",
      tags: ["minute", "archived"],
      uploadedById: userId,
    },
  });

  revalidateDocuments();
  return doc.id;
}