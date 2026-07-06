import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDataUrl, parseDataUrl } from "@/lib/image-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { logoUrl: true },
  });

  if (!club?.logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  if (isDataUrl(club.logoUrl)) {
    const parsed = parseDataUrl(club.logoUrl);
    if (!parsed) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(parsed.buffer), {
      headers: {
        "Content-Type": parsed.mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  return NextResponse.redirect(club.logoUrl);
}