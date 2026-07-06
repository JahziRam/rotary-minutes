import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getClubFeatures } from "@/lib/features";
import { buildTreasuryReportPdfBuffer } from "@/lib/pdf/build-treasury-pdf";
import {
  getTreasuryEntries,
  getTreasurySummary,
  type TreasuryFilters,
} from "@/lib/queries/treasury";
import type { ClubRoleType } from "@/lib/rotary";
import type { BudgetEntryType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const clubId = session.user.memberships[0]?.clubId;
  if (!clubId && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedClubId = clubId ?? url.searchParams.get("clubId");
  if (!resolvedClubId) {
    return NextResponse.json({ error: "No club" }, { status: 400 });
  }

  const membership = session.user.memberships.find((m) => m.clubId === resolvedClubId);
  const features = await getClubFeatures(resolvedClubId);
  if (!isFeatureEnabled(features, "treasuryEnabled", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const role = (membership?.role ?? "ADMIN") as ClubRoleType;
  const canView = await hasRolePermission(role, "treasury.view", session.user.isSuperAdmin);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const locale = url.searchParams.get("locale") ?? "fr";
  const filters: TreasuryFilters = {
    eventId: url.searchParams.get("eventId") ?? undefined,
    type: (url.searchParams.get("type") as BudgetEntryType) || undefined,
    from: url.searchParams.get("from")
      ? new Date(url.searchParams.get("from")!)
      : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
  };

  const [entries, summary, club] = await Promise.all([
    getTreasuryEntries(resolvedClubId, filters),
    getTreasurySummary(resolvedClubId, filters),
    prisma.club.findUnique({
      where: { id: resolvedClubId },
      select: {
        id: true,
        name: true,
        address: true,
        meetingLocation: true,
        logoUrl: true,
        currency: true,
      },
    }),
  ]);
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { buffer, filename } = await buildTreasuryReportPdfBuffer(
    club,
    entries.map((e) => ({
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      date: e.date,
      description: e.description,
      categoryName: e.category?.name ?? null,
      eventTitle: e.event?.title ?? null,
    })),
    summary,
    locale,
    filters
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}