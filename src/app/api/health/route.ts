import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function connectionHost(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const normalized = url.replace(/^prisma\+postgres:\/\//, "postgresql://");
    return new URL(normalized).hostname;
  } catch {
    return "invalid";
  }
}

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
    body.databaseUrlHost = connectionHost(process.env.DATABASE_URL);
    body.directUrlHost = connectionHost(process.env.DIRECT_URL);
    body.databaseUrlSet = !!process.env.DATABASE_URL?.trim();

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