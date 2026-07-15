import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertDocumentClubAccess,
  assertMinuteAttachmentClubAccess,
} from "@/lib/document-access";
import { isMinuteUserAttachment } from "@/lib/minute-attachments";
import { buildDocumentPreviewHtml } from "@/lib/document-preview";
import { normalizeDocumentMime } from "@/lib/document-types";

function contentDisposition(
  mode: "inline" | "attachment",
  fileName: string
): string {
  const safe = fileName.replace(/[^\w.\-() ]+/g, "_").trim() || "document";
  return `${mode}; filename="${safe}"`;
}

function decodeDataUrl(fileUrl: string): { mime: string; buffer: Buffer } | null {
  const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: normalizeDocumentMime(match[1]),
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const preview = url.searchParams.get("preview") === "1";
  const disposition = download ? "attachment" : "inline";

  const doc = await prisma.clubDocument.findUnique({
    where: { id },
    select: {
      id: true,
      clubId: true,
      title: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
      isArchived: true,
      minuteId: true,
      tags: true,
    },
  });

  if (!doc?.fileUrl || doc.isArchived) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const access = isMinuteUserAttachment(doc)
    ? await assertMinuteAttachmentClubAccess(doc.clubId)
    : await assertDocumentClubAccess(doc.clubId);
  if (!access.ok) {
    return NextResponse.json({ error: access.code }, { status: access.status });
  }

  const fileName = doc.fileName ?? "document";
  const mimeType = normalizeDocumentMime(doc.mimeType ?? "");

  if (doc.fileUrl.startsWith("data:")) {
    const decoded = decodeDataUrl(doc.fileUrl);
    if (!decoded) {
      return NextResponse.json({ error: "INVALID_FILE" }, { status: 500 });
    }

    if (preview) {
      const html = await buildDocumentPreviewHtml(
        decoded.buffer,
        decoded.mime,
        doc.title
      );
      if (!html) {
        return NextResponse.json({ error: "PREVIEW_UNAVAILABLE" }, { status: 415 });
      }
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return new NextResponse(new Uint8Array(decoded.buffer), {
      headers: {
        "Content-Type": decoded.mime,
        "Content-Disposition": contentDisposition(disposition, fileName),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (doc.fileUrl.startsWith("/api/pdf/")) {
    const target = new URL(doc.fileUrl, request.url);
    if (download) target.searchParams.set("download", "1");
    else target.searchParams.set("inline", "1");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(doc.fileUrl, request.url));
}