"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { fileToDocumentDataUrl, validateDocumentDataUrl } from "@/lib/document-storage";
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
  isArchived: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { firstName: true, lastName: true } },
} as const;

export async function listDocuments(filters?: {
  category?: DocumentCategory;
  includeArchived?: boolean;
}) {
  const auth = await requireDocumentsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const documents = await prisma.clubDocument.findMany({
    where: {
      clubId: ctx.clubId,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.includeArchived ? {} : { isArchived: false }),
    },
    select: documentSelect,
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const canManage = await hasRolePermission(ctx.role, "documents.manage", ctx.isSuperAdmin);

  return {
    documents: documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      uploadedByName: d.uploadedBy
        ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`
        : null,
    })),
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
    documents: documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      uploadedByName: d.uploadedBy
        ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`
        : null,
    })),
    canManage,
  };
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

  try {
    const fileDataUrl = await fileToDocumentDataUrl(file);
    return uploadDocument({
      title,
      category,
      description,
      tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
      fileDataUrl,
      fileName: file.name,
      mimeType: file.type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
  }
}

export async function archiveDocument(documentId: string) {
  const auth = await requireDocumentsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const doc = await prisma.clubDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

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