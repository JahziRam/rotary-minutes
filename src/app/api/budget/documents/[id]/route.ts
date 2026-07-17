import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
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

async function assertBudgetDocAccess(clubId: string) {
  const ctx = await getClubContext();
  if (!ctx || ctx.clubId !== clubId) {
    return { ok: false as const, status: 401, code: "UNAUTHORIZED" };
  }
  if (ctx.isSuperAdmin) return { ok: true as const };
  const projectsOn = isFeatureEnabled(ctx.features, "projectsEnabled", false);
  const treasuryOn = isFeatureEnabled(ctx.features, "treasuryEnabled", false);
  const canView =
    (projectsOn &&
      (await hasRolePermission(ctx.role, "projects.view", false))) ||
    (treasuryOn &&
      (await hasRolePermission(ctx.role, "treasury.view", false)));
  if (!canView) {
    return { ok: false as const, status: 403, code: "FORBIDDEN" };
  }
  return { ok: true as const };
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

  const doc = await prisma.budgetDocument.findUnique({
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

  if (!doc?.fileUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const access = await assertBudgetDocAccess(doc.clubId);
  if (!access.ok) {
    return NextResponse.json({ error: access.code }, { status: access.status });
  }

  const fileName = doc.fileName ?? "document";
  const mimeType = normalizeDocumentMime(doc.mimeType ?? "");

  if (!doc.fileUrl.startsWith("data:")) {
    return NextResponse.redirect(new URL(doc.fileUrl, request.url));
  }

  const decoded = decodeDataUrl(doc.fileUrl);
  if (!decoded) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 500 });
  }

  if (preview) {
    const html = await buildDocumentPreviewHtml(
      decoded.buffer,
      decoded.mime,
      doc.label ?? fileName
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
      "Content-Type": mimeType || decoded.mime || "application/octet-stream",
      "Content-Disposition": contentDisposition(disposition, fileName),
      "Cache-Control": "private, max-age=300",
    },
  });
}
