import { NextResponse } from "next/server";
import { exportTreasuryCsv, exportTreasuryOfx } from "@/actions/accounting-export";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const locale = searchParams.get("locale") ?? "fr";

  const result =
    format === "ofx"
      ? await exportTreasuryOfx({ from, to })
      : await exportTreasuryCsv({ from, to, locale });

  if ("error" in result && result.error) {
    const status =
      result.error === "UNAUTHORIZED" || result.error === "FORBIDDEN"
        ? 403
        : result.error === "FEATURE_DISABLED"
          ? 403
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (!("content" in result)) {
    return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 500 });
  }

  return new NextResponse(result.content, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}