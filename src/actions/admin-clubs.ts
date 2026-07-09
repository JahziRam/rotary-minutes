"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueClubSlug } from "@/lib/registration";
import { slugify } from "@/lib/utils";
import type { ClubRole, ClubType, Language } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;
  return session.user;
}

function revalidateAdminClubs(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/admin/clubs`);
    revalidatePath(`/${loc}/admin`);
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/settings/users`);
  }
  revalidatePath(`/${locale}/admin/clubs`);
}

async function resolveClubSlug(
  name: string,
  slug?: string,
  excludeClubId?: string
): Promise<{ slug?: string; error?: string }> {
  const candidate = slug?.trim() ? slugify(slug.trim()) : await generateUniqueClubSlug(name);
  if (!candidate) return { error: "INVALID_SLUG" };

  const existing = await prisma.club.findUnique({ where: { slug: candidate } });
  if (existing && existing.id !== excludeClubId) return { error: "SLUG_EXISTS" };

  return { slug: candidate };
}

// ─── Clubs ───────────────────────────────────────────────────────────────────

export async function createClubByAdmin(
  data: {
    name: string;
    slug?: string;
    type?: ClubType;
    city: string;
    country: string;
    district?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    language?: Language;
    trialDays?: number;
  },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const name = data.name.trim();
  if (!name) return { error: "INVALID_NAME" as const };

  const slugResult = await resolveClubSlug(name, data.slug);
  if (slugResult.error) return { error: slugResult.error as "INVALID_SLUG" | "SLUG_EXISTS" };

  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const trialDays = data.trialDays ?? settings?.trialDays ?? 14;
  const trialEndsAt = addDays(new Date(), trialDays);

  const club = await prisma.club.create({
    data: {
      name,
      slug: slugResult.slug!,
      type: data.type ?? "ROTARY",
      city: data.city.trim(),
      country: data.country.trim(),
      district: data.district?.trim() || null,
      address: data.address?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
      language: data.language ?? "FR",
    },
  });

  await prisma.subscription.create({
    data: {
      clubId: club.id,
      plan: "TRIAL",
      status: "TRIALING",
      trialEndsAt,
    },
  });

  const { syncClubFeaturesFromPlan } = await import("@/lib/features");
  await syncClubFeaturesFromPlan(club.id, "TRIAL");

  await prisma.auditLog.create({
    data: {
      clubId: club.id,
      userId: admin.id,
      action: "CLUB_CREATED_BY_ADMIN",
      entity: "Club",
      entityId: club.id,
      metadata: { name, slug: club.slug, type: club.type },
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const, clubId: club.id };
}

export async function updateClubByAdmin(
  clubId: string,
  data: {
    name?: string;
    slug?: string;
    type?: ClubType;
    city?: string;
    country?: string;
    district?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    language?: Language;
    isActive?: boolean;
  },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { error: "NOT_FOUND" as const };

  let nextSlug: string | undefined;
  if (data.slug !== undefined) {
    const slugResult = await resolveClubSlug(data.name ?? club.name, data.slug, clubId);
    if (slugResult.error) return { error: slugResult.error as "INVALID_SLUG" | "SLUG_EXISTS" };
    nextSlug = slugResult.slug;
  }

  await prisma.club.update({
    where: { id: clubId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(nextSlug !== undefined && { slug: nextSlug }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.city !== undefined && { city: data.city.trim() }),
      ...(data.country !== undefined && { country: data.country.trim() }),
      ...(data.district !== undefined && { district: data.district?.trim() || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim().toLowerCase() || null }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.website !== undefined && { website: data.website?.trim() || null }),
      ...(data.language !== undefined && { language: data.language }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: "CLUB_UPDATED_BY_ADMIN",
      entity: "Club",
      entityId: clubId,
      metadata: data as object,
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const };
}

// ─── Membres Rotary ────────────────────────────────────────────────────────────

export async function addMemberToClub(
  clubId: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    position?: string;
    joinDate?: string;
  },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { error: "NOT_FOUND" as const };

  const member = await prisma.member.create({
    data: {
      clubId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      position: data.position?.trim() || null,
      joinDate: data.joinDate ? new Date(data.joinDate) : null,
    },
  });

  await prisma.club.update({
    where: { id: clubId },
    data: { memberCount: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: "MEMBER_CREATED_BY_ADMIN",
      entity: "Member",
      entityId: member.id,
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const, memberId: member.id };
}

export async function updateClubMember(
  memberId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
    joinDate?: string;
    isActive?: boolean;
  },
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.member.update({
    where: { id: memberId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName.trim() }),
      ...(data.lastName !== undefined && { lastName: data.lastName.trim() }),
      ...(data.email !== undefined && { email: data.email?.trim().toLowerCase() || null }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.position !== undefined && { position: data.position?.trim() || null }),
      ...(data.joinDate !== undefined && {
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  if (data.isActive === false && existing.isActive) {
    await prisma.club.update({
      where: { id: existing.clubId },
      data: { memberCount: { decrement: 1 } },
    });
  } else if (data.isActive === true && !existing.isActive) {
    await prisma.club.update({
      where: { id: existing.clubId },
      data: { memberCount: { increment: 1 } },
    });
  }

  await prisma.auditLog.create({
    data: {
      clubId: existing.clubId,
      userId: admin.id,
      action: "MEMBER_UPDATED_BY_ADMIN",
      entity: "Member",
      entityId: memberId,
      metadata: data as object,
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const };
}

export async function removeMemberFromClub(memberId: string, locale: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (!existing.isActive) return { success: true as const };

  await prisma.member.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  await prisma.club.update({
    where: { id: existing.clubId },
    data: { memberCount: { decrement: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      clubId: existing.clubId,
      userId: admin.id,
      action: "MEMBER_REMOVED_BY_ADMIN",
      entity: "Member",
      entityId: memberId,
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const };
}

// ─── Utilisateurs / responsables ─────────────────────────────────────────────

export async function addClubResponsible(
  clubId: string,
  userId: string,
  role: ClubRole,
  customRoleId?: string | null,
  locale?: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { error: "NOT_FOUND" as const };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "USER_NOT_FOUND" as const };

  if (customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: { id: customRoleId, isActive: true },
    });
    if (!customRole) return { error: "CUSTOM_ROLE_NOT_FOUND" as const };
  }

  const existing = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });

  if (existing?.isActive) return { error: "ALREADY_MEMBER" as const };

  const membership = existing
    ? await prisma.clubMembership.update({
        where: { id: existing.id },
        data: {
          role,
          customRoleId: customRoleId ?? null,
          isActive: true,
          approvalStatus: "APPROVED",
        },
      })
    : await prisma.clubMembership.create({
        data: {
          clubId,
          userId,
          role,
          customRoleId: customRoleId ?? null,
          approvalStatus: "APPROVED",
          isActive: true,
        },
      });

  await prisma.auditLog.create({
    data: {
      clubId,
      userId: admin.id,
      action: "CLUB_RESPONSIBLE_ADDED",
      entity: "ClubMembership",
      entityId: membership.id,
      metadata: { userId, role, customRoleId },
    },
  });

  if (locale) revalidateAdminClubs(locale);
  return { success: true as const, membershipId: membership.id };
}

export async function updateClubMembership(
  membershipId: string,
  role: ClubRole,
  customRoleId?: string | null,
  locale?: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) return { error: "NOT_FOUND" as const };

  if (customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: { id: customRoleId, isActive: true },
    });
    if (!customRole) return { error: "CUSTOM_ROLE_NOT_FOUND" as const };
  }

  await prisma.clubMembership.update({
    where: { id: membershipId },
    data: {
      role,
      customRoleId: customRoleId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: membership.clubId,
      userId: admin.id,
      action: "CLUB_MEMBERSHIP_UPDATED",
      entity: "ClubMembership",
      entityId: membershipId,
      metadata: { role, customRoleId },
    },
  });

  if (locale) revalidateAdminClubs(locale);
  return { success: true as const };
}

export async function removeClubMembership(membershipId: string, locale: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) return { error: "NOT_FOUND" as const };
  if (!membership.isActive) return { success: true as const };

  await prisma.clubMembership.update({
    where: { id: membershipId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      clubId: membership.clubId,
      userId: admin.id,
      action: "CLUB_MEMBERSHIP_REMOVED",
      entity: "ClubMembership",
      entityId: membershipId,
    },
  });

  revalidateAdminClubs(locale);
  return { success: true as const };
}