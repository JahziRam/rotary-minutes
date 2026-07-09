import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_TRACKING_GIF,
  verifyEmailOpenToken,
} from "@/lib/email-tracking";

const GIF_HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

function trackingGifResponse() {
  return new NextResponse(EMAIL_TRACKING_GIF, { headers: GIF_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";

  if (!token || !verifyEmailOpenToken(logId, token)) {
    return trackingGifResponse();
  }

  try {
    const log = await prisma.emailLog.findUnique({
      where: { id: logId },
      select: { openedAt: true, campaignId: true, status: true },
    });

    if (log?.status === "sent" && !log.openedAt) {
      const openedAt = new Date();
      await prisma.$transaction([
        prisma.emailLog.update({
          where: { id: logId },
          data: { openedAt },
        }),
        prisma.emailCampaign.update({
          where: { id: log.campaignId },
          data: { openCount: { increment: 1 } },
        }),
      ]);
    }
  } catch (e) {
    console.warn("[email-tracking] open record failed:", e);
  }

  return trackingGifResponse();
}