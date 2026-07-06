import { NextResponse } from "next/server";
import { processBirthdayReminders } from "@/lib/smart-reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processBirthdayReminders();
  return NextResponse.json(result);
}