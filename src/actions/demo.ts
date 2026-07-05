"use server";

import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME } from "@/lib/demo-constants";
import { ensureDemoSessionHelper } from "@/lib/queries/demo";

export async function initDemoSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEMO_COOKIE_NAME)?.value;
  const session = await ensureDemoSessionHelper(existing);

  cookieStore.set(DEMO_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });

  return {
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
  };
}