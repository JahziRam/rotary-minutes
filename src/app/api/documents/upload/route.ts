import { NextResponse } from "next/server";
import { getClubContext } from "@/lib/club-context";
import { assertDocumentManageAccess } from "@/lib/document-access";
import {
  moveDocumentToFolder,
  uploadDocumentFromBuffer,
} from "@/actions/documents";
import { validateUploadFiles } from "@/lib/upload-limits";
import type { DocumentCategory } from "@/generated/prisma/client";

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base || fileName;
}

export async function POST(request: Request) {
  const ctx = await getClubContext();
  if (!ctx) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const access = await assertDocumentManageAccess(ctx.clubId);
  if (!access.ok) {
    return NextResponse.json({ error: access.code }, { status: access.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const category = formData.get("category") as DocumentCategory;
  const description = (formData.get("description") as string)?.trim();
  const tagsRaw = (formData.get("tags") as string)?.trim();
  const titleSingle = (formData.get("title") as string)?.trim();
  const folderId = (formData.get("folderId") as string)?.trim() || null;
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!category) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const batchError = validateUploadFiles(files);
  if (batchError) {
    return NextResponse.json({ error: batchError }, { status: 400 });
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const documentIds: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const title = titleSingle || titleFromFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadDocumentFromBuffer({
      title,
      category,
      description,
      tags,
      buffer,
      fileName: file.name,
      mimeType: file.type,
    });

    if ("success" in result && result.success) {
      documentIds.push(result.documentId);
      if (folderId) {
        await moveDocumentToFolder(result.documentId, folderId);
      }
    } else {
      failed.push(file.name);
    }
  }

  if (documentIds.length === 0) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    uploaded: documentIds.length,
    documentIds,
    failed,
  });
}