import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

export const VIEW_AS_CLUB_COOKIE = "rm_view_as_club";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const getViewAsClubId = cache(async (): Promise<string | null> => {
  noStore();
  const cookieStore = await cookies();
  const value = cookieStore.get(VIEW_AS_CLUB_COOKIE)?.value?.trim();
  return value || null;
});

export function viewAsClubCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };
}