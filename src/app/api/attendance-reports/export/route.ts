import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getClubFeatures } from "@/lib/features";
import { buildAttendanceReportPdfBuffer } from "@/lib/pdf/build-attendance-report-pdf";
import type { ClubRoleType } from "@/lib/rotary";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = session.user.memberships[0];
  if (!membership && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubId = membership?.clubId;
  if (!clubId) {
    return NextResponse.json({ error: "No club" }, { status: 400 });
  }

  const features = await getClubFeatures(clubId);
  if (!isFeatureEnabled(features, "attendanceReportsEnabled", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const role = (membership?.role ?? "ADMIN") as ClubRoleType;
  const canView = await hasRolePermission(role, "attendance.view", session.user.isSuperAdmin);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isFeatureEnabled(features, "pdfExport", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "PDF disabled" }, { status: 403 });
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { name: true, language: true },
  });
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? (club.language === "EN" ? "en" : "fr");

  const { buffer, filename } = await buildAttendanceReportPdfBuffer(clubId, club.name, locale);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}