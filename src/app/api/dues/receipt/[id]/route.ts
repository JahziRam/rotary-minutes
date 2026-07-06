import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getClubFeatures } from "@/lib/features";
import { buildDuesReceiptPdfBuffer } from "@/lib/pdf/build-dues-pdf";
import type { ClubRoleType } from "@/lib/rotary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dues = await prisma.memberDues.findUnique({
    where: { id },
    include: {
      member: true,
      club: {
        select: {
          id: true,
          name: true,
          address: true,
          meetingLocation: true,
          logoUrl: true,
          language: true,
        },
      },
    },
  });
  if (!dues || dues.status !== "PAID") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = session.user.memberships.find((m) => m.clubId === dues.clubId);
  if (!membership && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const features = await getClubFeatures(dues.clubId);
  if (!isFeatureEnabled(features, "duesEnabled", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const role = (membership?.role ?? "ADMIN") as ClubRoleType;
  const canView = await hasRolePermission(role, "dues.view", session.user.isSuperAdmin);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? (dues.club.language === "EN" ? "en" : "fr");

  const { buffer, filename } = await buildDuesReceiptPdfBuffer(
    dues.club,
    dues.member,
    dues,
    locale
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}