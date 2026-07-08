import { NextResponse } from "next/server";
import { getGaMeasurementId, isAnalyticsConfigured } from "@/lib/analytics-config";

export async function GET() {
  const [measurementId, enabled] = await Promise.all([
    getGaMeasurementId(),
    isAnalyticsConfigured(),
  ]);
  return NextResponse.json({ measurementId, enabled });
}