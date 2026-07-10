import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTreasuryClubAccess } from "@/lib/treasury-access";
import { buildDocumentPreviewHtml } from "@/lib/document-preview";
import { normalizeDocumentMime } from "@/lib/document-types";

function contentDisposition(
  mode: "inline" | "attachment",
  fileName: string
): string {
  const safe = fileName.replace(/[^\w.\-() ]+/g, "_").trim() || "voucher";
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

  const voucher = await prisma.treasuryVoucher.findUnique({
    where: { id },
    select: {
      id: true,
      clubId: true,
      label: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
    },
  });

  if (!voucher?.fileUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const access = await assertTreasuryClubAccess(voucher.clubId);
  if (!access.ok) {
    return NextResponse.json({ error: access.code }, { status: access.status });
  }

  const fileName = voucher.fileName ?? "voucher";
  const mimeType = normalizeDocumentMime(voucher.mimeType ?? "");

  if (!voucher.fileUrl.startsWith("data:")) {
    return NextResponse.redirect(new URL(voucher.fileUrl, request.url));
  }

  const decoded = decodeDataUrl(voucher.fileUrl);
  if (!decoded) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 500 });
  }

  if (preview) {
    const html = await buildDocumentPreviewHtml(
      decoded.buffer,
      decoded.mime,
      voucher.label ?? fileName
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

  return new NextResponse(decoded.buffer, {
    headers: {
      "Content-Type": mimeType || decoded.mime,
      "Content-Disposition": contentDisposition(disposition, fileName),
      "Cache-Control": "private, max-age=3600",
    },
  });
}