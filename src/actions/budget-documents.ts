"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import {
  fileToDocumentDataUrl,
  validateDocumentDataUrl,
} from "@/lib/document-storage";
import {
  budgetDocumentDownloadUrl,
  budgetDocumentViewUrl,
} from "@/lib/budget-document-urls";
import { validateUploadFiles } from "@/lib/upload-limits";
import type { BudgetDocumentKind } from "@/generated/prisma/client";

export type BudgetDocumentScope =
  | { type: "project"; id: string }
  | { type: "event"; id: string }
  | { type: "mandate"; mandateYear: number }
  | { type: "action"; id: string };

function revalidateBudgetDocs(scope?: BudgetDocumentScope) {
  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/projects`);
    revalidatePath(`/${loc}/treasury`);
    revalidatePath(`/${loc}/events`);
    if (scope?.type === "project") {
      revalidatePath(`/${loc}/projects/${scope.id}`);
    }
  }
}

async function requireBudgetDocView() {
  const projects = await requireFeature("projectsEnabled");
  if (!projects.error) {
    const { ctx } = projects;
    if (ctx.isSuperAdmin) return { ctx };
    const ok =
      (await hasRolePermission(ctx.role, "projects.view", false)) ||
      (await hasRolePermission(ctx.role, "treasury.view", false));
    if (ok) return { ctx };
  }

  const treasury = await requireFeature("treasuryEnabled");
  if (treasury.error) return treasury;
  const { ctx } = treasury;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "treasury.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireBudgetDocManage() {
  const projects = await requireFeature("projectsEnabled");
  if (!projects.error) {
    const auth = await requirePermission("projects.manage");
    if (!auth.error) return auth;
  }
  const feature = await requireFeature("treasuryEnabled");
  if (feature.error) return feature;
  return requirePermission("treasury.manage");
}

async function assertScopeBelongsToClub(scope: BudgetDocumentScope, clubId: string) {
  if (scope.type === "project") {
    return !!(await prisma.clubProject.findFirst({
      where: { id: scope.id, clubId },
      select: { id: true },
    }));
  }
  if (scope.type === "event") {
    return !!(await prisma.clubEvent.findFirst({
      where: { id: scope.id, clubId },
      select: { id: true },
    }));
  }
  if (scope.type === "action") {
    return !!(await prisma.clubAction.findFirst({
      where: { id: scope.id, clubId },
      select: { id: true },
    }));
  }
  return Number.isInteger(scope.mandateYear) && scope.mandateYear > 2000;
}

function scopeWhere(scope: BudgetDocumentScope) {
  if (scope.type === "project") return { projectId: scope.id };
  if (scope.type === "event") return { eventId: scope.id };
  if (scope.type === "action") return { actionId: scope.id };
  return { mandateYear: scope.mandateYear, projectId: null, eventId: null };
}

function scopeCreateData(scope: BudgetDocumentScope) {
  if (scope.type === "project") {
    return { projectId: scope.id, eventId: null, actionId: null, mandateYear: null };
  }
  if (scope.type === "event") {
    return { projectId: null, eventId: scope.id, actionId: null, mandateYear: null };
  }
  if (scope.type === "action") {
    return { projectId: null, eventId: null, actionId: scope.id, mandateYear: null };
  }
  return {
    projectId: null,
    eventId: null,
    actionId: null,
    mandateYear: scope.mandateYear,
  };
}

function mapDoc(v: {
  id: string;
  kind: BudgetDocumentKind;
  label: string | null;
  fileName: string;
  mimeType: string;
  amount: unknown;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: v.id,
    kind: v.kind,
    label: v.label,
    fileName: v.fileName,
    mimeType: v.mimeType,
    amount: v.amount != null ? Number(v.amount) : null,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    viewUrl: budgetDocumentViewUrl(v.id, v.mimeType),
    downloadUrl: budgetDocumentDownloadUrl(v.id),
  };
}

export async function listBudgetDocuments(scope: BudgetDocumentScope) {
  const auth = await requireBudgetDocView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  if (!(await assertScopeBelongsToClub(scope, ctx.clubId))) {
    return { error: "NOT_FOUND" as const };
  }

  const docs = await prisma.budgetDocument.findMany({
    where: { clubId: ctx.clubId, ...scopeWhere(scope) },
    orderBy: { createdAt: "desc" },
  });

  const canManage =
    (await hasRolePermission(ctx.role, "projects.manage", ctx.isSuperAdmin)) ||
    (await hasRolePermission(ctx.role, "treasury.manage", ctx.isSuperAdmin));

  return { canManage, documents: docs.map(mapDoc) };
}

export async function uploadBudgetDocument(formData: FormData) {
  const auth = await requireBudgetDocManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const scopeType = String(formData.get("scopeType") ?? "").trim();
  const scopeId = String(formData.get("scopeId") ?? "").trim();
  const mandateYearRaw = String(formData.get("mandateYear") ?? "").trim();
  const kind = (String(formData.get("kind") ?? "OTHER").trim() ||
    "OTHER") as BudgetDocumentKind;
  const label = String(formData.get("label") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;

  let scope: BudgetDocumentScope;
  if (scopeType === "project" && scopeId) {
    scope = { type: "project", id: scopeId };
  } else if (scopeType === "event" && scopeId) {
    scope = { type: "event", id: scopeId };
  } else if (scopeType === "action" && scopeId) {
    scope = { type: "action", id: scopeId };
  } else if (scopeType === "mandate" && mandateYearRaw) {
    scope = { type: "mandate", mandateYear: parseInt(mandateYearRaw, 10) };
  } else {
    return { error: "INVALID_SCOPE" as const };
  }

  if (!(await assertScopeBelongsToClub(scope, ctx.clubId))) {
    return { error: "NOT_FOUND" as const };
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "NO_FILES" as const };

  const validationError = validateUploadFiles(files);
  if (validationError) return { error: validationError };

  const created: string[] = [];
  for (const file of files) {
    let dataUrl: string;
    let mimeType: string;
    try {
      const converted = await fileToDocumentDataUrl(file);
      dataUrl = converted.dataUrl;
      mimeType = converted.mimeType;
    } catch {
      return { error: "INVALID_FILE" as const };
    }
    const formatError = validateDocumentDataUrl(dataUrl);
    if (formatError) return { error: "INVALID_FILE" as const };

    const doc = await prisma.budgetDocument.create({
      data: {
        clubId: ctx.clubId,
        kind: [
          "QUOTE",
          "PROFORMA",
          "PURCHASE_ORDER",
          "CONTRACT",
          "ESTIMATE",
          "INVOICE",
          "OTHER",
        ].includes(kind)
          ? kind
          : "OTHER",
        label,
        notes,
        amount: amount != null && Number.isFinite(amount) ? amount : null,
        fileUrl: dataUrl,
        fileName: file.name,
        mimeType,
        uploadedById: ctx.userId,
        ...scopeCreateData(scope),
      },
    });
    created.push(doc.id);
  }

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "BUDGET_DOCUMENT_UPLOADED",
      entity: "BudgetDocument",
      entityId: created[0],
      metadata: { count: created.length, scope },
    },
  });

  revalidateBudgetDocs(scope);
  return { success: true as const, ids: created };
}

export async function deleteBudgetDocument(documentId: string) {
  const auth = await requireBudgetDocManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const doc = await prisma.budgetDocument.findFirst({
    where: { id: documentId, clubId: ctx.clubId },
    select: { id: true, projectId: true, eventId: true, mandateYear: true },
  });
  if (!doc) return { error: "NOT_FOUND" as const };

  await prisma.budgetDocument.delete({ where: { id: documentId } });

  const scope: BudgetDocumentScope | undefined = doc.projectId
    ? { type: "project", id: doc.projectId }
    : doc.eventId
      ? { type: "event", id: doc.eventId }
      : doc.mandateYear
        ? { type: "mandate", mandateYear: doc.mandateYear }
        : undefined;

  revalidateBudgetDocs(scope);
  return { success: true as const };
}
