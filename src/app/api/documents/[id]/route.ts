import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClubFeatures } from "@/lib/features";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRoleType } from "@/lib/rotary";

function contentDisposition(
  mode: "inline" | "attachment",
  fileName: string
): string {
  const safe = fileName.replace(/[^\w.\-() ]+/g, "_").trim() || "document";
  return `${mode}; filename="${safe}"`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  const doc = await prisma.clubDocument.findUnique({
    where: { id },
    select: {
      id: true,
      clubId: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
      isArchived: true,
    },
  });

  if (!doc?.fileUrl || doc.isArchived) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const isSuperAdmin = session.user.isSuperAdmin;
  const membership = session.user.memberships.find((m) => m.clubId === doc.clubId);

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!isSuperAdmin && membership) {
    const features = await getClubFeatures(doc.clubId);
    if (!isFeatureEnabled(features, "documentsEnabled", false)) {
      return NextResponse.json({ error: "FEATURE_DISABLED" }, { status: 403 });
    }
    const allowed = await hasRolePermission(
      membership.role as ClubRoleType,
      "documents.view",
      false
    );
    if (!allowed) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const fileName = doc.fileName ?? "document";

  if (doc.fileUrl.startsWith("data:")) {
    const match = doc.fileUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return NextResponse.json({ error: "INVALID_FILE" }, { status: 500 });
    }
    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": match[1],
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

  return NextResponse.redirect(doc.fileUrl);
}