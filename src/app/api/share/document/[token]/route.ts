import { NextResponse } from "next/server";
import { getSharedDocument } from "@/actions/documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getSharedDocument(token);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "EXPIRED" ? 410 : 404 });
  }

  const { document } = result;
  if (!document.fileUrl) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 404 });
  }

  if (document.fileUrl.startsWith("data:")) {
    const match = document.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "INVALID_FILE" }, { status: 500 });
    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": match[1],
        "Content-Disposition": `inline; filename="${document.fileName ?? "document"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (document.fileUrl.startsWith("/api/pdf/")) {
    const target = new URL(document.fileUrl, request.url);
    target.searchParams.set("inline", "1");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(document.fileUrl, request.url));
}