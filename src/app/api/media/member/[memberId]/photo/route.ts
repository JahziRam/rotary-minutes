import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isDataUrl, parseDataUrl } from "@/lib/image-data-url";

let defaultAvatarCache: Buffer | null = null;

async function getDefaultAvatarPng(): Promise<Buffer> {
  if (defaultAvatarCache) return defaultAvatarCache;
  const filePath = path.join(
    process.cwd(),
    "public",
    "brand",
    "member-default-avatar.png"
  );
  defaultAvatarCache = await readFile(filePath);
  return defaultAvatarCache;
}

async function defaultAvatarResponse(): Promise<NextResponse> {
  try {
    const buf = await getDefaultAvatarPng();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { photoUrl: true },
    });

    const photo = member?.photoUrl?.trim();
    if (!photo) {
      return defaultAvatarResponse();
    }

    if (isDataUrl(photo)) {
      const parsed = parseDataUrl(photo);
      if (!parsed) return defaultAvatarResponse();
      return new NextResponse(new Uint8Array(parsed.buffer), {
        headers: {
          "Content-Type": parsed.mime,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // External / Vercel Blob URL
    if (/^https?:\/\//i.test(photo)) {
      return NextResponse.redirect(photo);
    }

    // Relative path stored in DB
    if (photo.startsWith("/")) {
      return NextResponse.redirect(new URL(photo, _request.url));
    }

    return defaultAvatarResponse();
  } catch (e) {
    console.error("[media/member/photo]", memberId, e);
    return defaultAvatarResponse();
  }
}
