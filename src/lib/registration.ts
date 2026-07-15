import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { ROTARACT_DISCOUNT_PERCENT } from "@/lib/registration-constants";
import type { ClubType } from "@/generated/prisma/client";

export { ROTARACT_DISCOUNT_PERCENT };

export async function findDuplicateClub(data: {
  clubName: string;
  city: string;
  country: string;
}): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.club.findFirst({
    where: {
      isActive: true,
      name: { equals: data.clubName.trim(), mode: "insensitive" },
      city: { equals: data.city.trim(), mode: "insensitive" },
      country: { equals: data.country.trim(), mode: "insensitive" },
    },
    select: { id: true, name: true },
  });
  return existing;
}

export async function generateUniqueClubSlug(clubName: string): Promise<string> {
  const base = slugify(clubName);
  const existing = await prisma.club.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Date.now()}`;
}

export async function findExistingMemberInClub(
  clubId: string,
  email: string,
  userId?: string
): Promise<boolean> {
  const { findMemberDuplicateInClub } = await import("@/lib/member-dedup");
  const duplicate = await findMemberDuplicateInClub(clubId, {
    email,
    firstName: "",
    lastName: "",
  });
  if (duplicate) return true;

  if (userId) {
    const byUser = await prisma.member.findFirst({
      where: { clubId, userId },
      select: { id: true },
    });
    if (byUser) return true;
  }

  return false;
}

export async function findExistingMembership(
  clubId: string,
  userId: string
): Promise<{ approvalStatus: string } | null> {
  return prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { approvalStatus: true },
  });
}

export function applyPercentDiscount(basePrice: number, percent: number): number {
  return Math.max(0, Math.round(basePrice * (1 - percent / 100)));
}

export function resolveCheckoutDiscountPercent(
  clubType: ClubType,
  promoPercent?: number
): number | undefined {
  const rotaract = clubType === "ROTARACT" ? ROTARACT_DISCOUNT_PERCENT : 0;
  if (promoPercent != null && promoPercent > 0) {
    return Math.max(rotaract, promoPercent);
  }
  return rotaract > 0 ? rotaract : undefined;
}