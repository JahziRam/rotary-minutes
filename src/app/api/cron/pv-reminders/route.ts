import { NextResponse } from "next/server";
import { processPvReminders } from "@/lib/reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPvReminders();
  return NextResponse.json(result);
}