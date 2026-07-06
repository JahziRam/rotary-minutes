import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight liveness probe for Render health checks and external keep-alive pings.
 * ?deep=1 runs a DB ping (for diagnostics).
 */
export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const body: Record<string, unknown> = {
    ok: true,
    service: "rotary-minutes",
    ts: new Date().toISOString(),
  };

  if (deep) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      body.database = "ok";
      try {
        await prisma.clubFeatures.findFirst({ select: { clubId: true } });
        body.clubFeatures = "ok";
      } catch (e) {
        body.clubFeatures = "error";
        body.clubFeaturesError = e instanceof Error ? e.message : "unknown";
        body.ok = false;
      }
    } catch (e) {
      body.database = "error";
      body.databaseError = e instanceof Error ? e.message : "unknown";
      body.ok = false;
    }
  }

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}