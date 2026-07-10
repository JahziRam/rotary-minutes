import { NextResponse } from "next/server";
import { getClubContext } from "@/lib/club-context";
import { uploadTreasuryVoucherFiles } from "@/actions/treasury-vouchers";

export async function POST(request: Request) {
  const ctx = await getClubContext();
  if (!ctx) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const result = await uploadTreasuryVoucherFiles(formData);

  if ("error" in result && result.error) {
    const status =
      result.error === "TOO_LARGE" || result.error === "TOO_MANY_FILES" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}