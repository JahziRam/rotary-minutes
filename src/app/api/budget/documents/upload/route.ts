import { NextResponse } from "next/server";
import { uploadBudgetDocument } from "@/actions/budget-documents";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await uploadBudgetDocument(formData);
    if ("error" in result) {
      const status =
        result.error === "FORBIDDEN" || result.error === "UNAUTHORIZED"
          ? 403
          : result.error === "NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
