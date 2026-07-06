import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDataUrl, parseDataUrl } from "@/lib/image-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { photoUrl: true },
  });

  if (!member?.photoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  if (isDataUrl(member.photoUrl)) {
    const parsed = parseDataUrl(member.photoUrl);
    if (!parsed) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(parsed.buffer), {
      headers: {
        "Content-Type": parsed.mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  return NextResponse.redirect(member.photoUrl);
}