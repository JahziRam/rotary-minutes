import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getClubFeatures } from "@/lib/features";
import { buildDuesHistoryPdfBuffer } from "@/lib/pdf/build-dues-pdf";
import { currentFiscalYear } from "@/lib/dues";
import type { ClubRoleType } from "@/lib/rotary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.user.memberships.find((m) => m.clubId === member.clubId);
  if (!membership && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const features = await getClubFeatures(member.clubId);
  if (!isFeatureEnabled(features, "duesEnabled", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const role = (membership?.role ?? "ADMIN") as ClubRoleType;
  const canView = await hasRolePermission(role, "dues.view", session.user.isSuperAdmin);
  const isSelf = member.userId === session.user.id;
  if (!canView && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fiscalYear = parseInt(
    url.searchParams.get("fiscalYear") ?? String(currentFiscalYear()),
    10
  );
  const locale = url.searchParams.get("locale") ?? "fr";

  const [club, periods] = await Promise.all([
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: {
        id: true,
        name: true,
        address: true,
        meetingLocation: true,
        logoUrl: true,
        language: true,
      },
    }),
    prisma.memberDues.findMany({
      where: { clubId: member.clubId, memberId, fiscalYear },
      orderBy: { periodIndex: "asc" },
    }),
  ]);
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { buffer, filename } = await buildDuesHistoryPdfBuffer(club, member, periods, locale);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}