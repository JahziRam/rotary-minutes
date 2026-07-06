import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRolePermission } from "@/lib/roles";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getClubFeatures } from "@/lib/features";
import { getTreasuryEntries, type TreasuryFilters } from "@/lib/queries/treasury";
import type { ClubRoleType } from "@/lib/rotary";
import type { BudgetEntryType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubId = session.user.memberships[0]?.clubId;
  if (!clubId && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedClubId = clubId!;
  const membership = session.user.memberships.find((m) => m.clubId === resolvedClubId);
  const features = await getClubFeatures(resolvedClubId);
  if (!isFeatureEnabled(features, "treasuryEnabled", session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const role = (membership?.role ?? "ADMIN") as ClubRoleType;
  const canView = await hasRolePermission(role, "treasury.view", session.user.isSuperAdmin);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const filters: TreasuryFilters = {
    eventId: url.searchParams.get("eventId") ?? undefined,
    type: (url.searchParams.get("type") as BudgetEntryType) || undefined,
    from: url.searchParams.get("from")
      ? new Date(url.searchParams.get("from")!)
      : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
  };

  const entries = await getTreasuryEntries(resolvedClubId, filters);
  const header = "Date,Type,Description,Category,Amount,Currency,Event,Reference\n";
  const rows = entries.map((e) => {
    const cols = [
      e.date.toISOString().slice(0, 10),
      e.type,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category?.name ?? "",
      Number(e.amount).toFixed(2),
      e.currency,
      e.event?.title ?? "",
      e.reference ?? "",
    ];
    return cols.join(",");
  });

  const csv = header + rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="treasury-export.csv"',
    },
  });
}