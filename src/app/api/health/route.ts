import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight liveness probe for Render health checks and external keep-alive pings.
 * Avoids DB/auth — cold starts still occur but response is fast once the process is up.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "rotary-minutes",
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}