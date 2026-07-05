import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.subscription.updateMany({
    where: {
      status: "TRIALING",
      trialEndsAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ expired: expired.count, at: now.toISOString() });
}