import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminStats } from "@/lib/queries/admin";
import { renderStatsPdf } from "@/lib/pdf/render";
import { getAppName } from "@/lib/app-settings";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [stats, subscriptions, minutes] = await Promise.all([
      getAdminStats().catch((e) => {
        console.error("[export-pdf] getAdminStats:", e);
        return {
          clubsActive: 0,
          clubsInactive: 0,
          usersCount: 0,
          activeSubscriptions: 0,
          trialingCount: 0,
          trialsExpiringSoon: 0,
          minutesThisMonth: 0,
          finalizedThisMonth: 0,
          finalizedMinutes: 0,
          newClubsThisMonth: 0,
          totalMeetings: 0,
          totalMembers: 0,
        };
      }),
      prisma.subscription.groupBy({ by: ["plan", "status"], _count: true }).catch(() => []),
      prisma.minute.groupBy({ by: ["status"], _count: true }).catch(() => []),
    ]);

    const exportedAt = new Date().toISOString();
    const appName = await getAppName();
    const pdfData = {
      appName,
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
    const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-stats-${exportedAt.split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[export-pdf]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}