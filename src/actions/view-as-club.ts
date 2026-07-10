"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import {
  VIEW_AS_CLUB_COOKIE,
  viewAsClubCookieOptions,
} from "@/lib/view-as-club";

export async function setViewAsClub(clubId: string, locale: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.isSuperAdmin) {
    redirect(`/${locale}/admin`);
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, isActive: true },
  });
  if (!club) {
    redirect(`/${locale}/admin/clubs`);
  }

  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_CLUB_COOKIE, club.id, viewAsClubCookieOptions());

  redirect(`/${locale}/dashboard`);
}

export async function clearViewAsClub(locale: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.isSuperAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_CLUB_COOKIE);

  redirect(`/${locale}/admin`);
}