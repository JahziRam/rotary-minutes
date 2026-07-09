import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildDistrictGovernorReport,
  governorReportToCsv,
} from "@/lib/district-governor-report";
import { canAccessDistrict } from "@/lib/district-access";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const district = url.searchParams.get("district");
  if (!district) {
    return NextResponse.json({ error: "district required" }, { status: 400 });
  }

  if (
    !session.user.isSuperAdmin &&
    !(await canAccessDistrict(session.user.id, district))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await buildDistrictGovernorReport(district);
  const csv = governorReportToCsv(report);
  const filename = `governor-report-${district}-${report.mandateLabel}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}