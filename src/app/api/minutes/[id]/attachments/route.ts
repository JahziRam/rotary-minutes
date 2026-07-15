import { NextResponse } from "next/server";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { loadMinuteForContext, assertMinuteAccess } from "@/lib/commission-scope";
import { uploadMinuteAttachmentFromBuffer } from "@/actions/minute-attachments";
import { validateUploadFiles } from "@/lib/upload-limits";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: minuteId } = await params;
  const ctx = await getClubContext();
  if (!ctx) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const canEdit = await hasRolePermission(ctx.role, "minutes.edit", ctx.isSuperAdmin);
  if (!canEdit) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const minute = await loadMinuteForContext(ctx, minuteId);
  if (!minute) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const access = await assertMinuteAccess(ctx, minute);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  if (minute.status === "ARCHIVED") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const batchError = validateUploadFiles(files);
  if (batchError) {
    return NextResponse.json({ error: batchError }, { status: 400 });
  }

  const uploaded: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadMinuteAttachmentFromBuffer(minuteId, {
      buffer,
      fileName: file.name,
      mimeType: file.type,
    });

    if ("success" in result && result.success) {
      uploaded.push(result.attachment.id);
    } else {
      failed.push(file.name);
    }
  }

  if (uploaded.length === 0) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    uploaded: uploaded.length,
    documentIds: uploaded,
    failed,
  });
}