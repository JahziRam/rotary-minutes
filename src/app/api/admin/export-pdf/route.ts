import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminStats } from "@/lib/queries/admin";
import { renderStatsPdf } from "@/lib/pdf/render";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, subscriptions, minutes] = await Promise.all([
    getAdminStats(),
    prisma.subscription.groupBy({ by: ["plan", "status"], _count: true }),
    prisma.minute.groupBy({ by: ["status"], _count: true }),
  ]);

  const exportedAt = new Date().toISOString();
  const pdfData = {
    exportedAt,
    overview: {
      clubsActive: stats.clubsActive,
      clubsInactive: stats.clubsInactive,
      usersCount: stats.usersCount,
      activeSubscriptions: stats.activeSubscriptions,
      trialingCount: stats.trialingCount,
      minutesThisMonth: stats.minutesThisMonth,
      finalizedThisMonth: stats.finalizedThisMonth,
      totalMeetings: stats.totalMeetings,
      totalMembers: stats.totalMembers,
      newClubsThisMonth: stats.newClubsThisMonth,
    },
    subscriptions: subscriptions.map((s) => ({
      plan: s.plan,
      status: s.status,
      count: s._count,
    })),
    minutes: minutes.map((m) => ({
      status: m.status,
      count: m._count,
    })),
  };

  const buffer = await renderStatsPdf(pdfData);
  const filename = `rotary-minutes-stats-${exportedAt.split("T")[0]}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}