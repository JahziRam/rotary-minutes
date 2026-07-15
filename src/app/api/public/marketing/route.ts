import { NextResponse } from "next/server";
import { getActivePublicAddons, getActivePublicPlans } from "@/lib/plans";
import { locales } from "@/i18n/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "fr";
  const safeLocale = locales.includes(locale as (typeof locales)[number]) ? locale : "fr";

  const [{ plans, billing }, { addons }] = await Promise.all([
    getActivePublicPlans(safeLocale),
    getActivePublicAddons(safeLocale),
  ]);

  return NextResponse.json(
    { plans, billing, addons },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}