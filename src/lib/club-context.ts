import { cache } from "react";
import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import { getClubFeatures, type ClubFeatureSet } from "@/lib/features";
import { getViewAsClubId } from "@/lib/view-as-club";
import type { ClubRoleType } from "@/lib/rotary";
import type { Club, Member, Subscription } from "@/generated/prisma/client";

export type ClubContextClub = Club & {
  subscription: Subscription | null;
  members?: Member[];
};

export type ClubContext = {
  userId: string;
  isSuperAdmin: boolean;
  role: ClubRoleType;
  customRoleId: string | null;
  club: ClubContextClub;
  clubId: string;
  clubName: string;
  features: ClubFeatureSet;
};

/** Fields needed for attendance pickers / stats — never photoUrl blobs. */
const memberLiteSelect = {
  id: true,
  clubId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  position: true,
  isActive: true,
  isHonoraryMember: true,
  commissionId: true,
  userId: true,
  birthday: true,
  joinDate: true,
  registrationNumber: true,
  createdAt: true,
  updatedAt: true,
  sponsorName: true,
  bio: true,
  spouseFirstName: true,
  spouseLastName: true,
  spouseBirthday: true,
  duesPaymentPlan: true,
  // photoUrl intentionally omitted (use /api/media/member/[id]/photo)
} as const;

async function resolveClubContext(includeMembers: boolean): Promise<ClubContext | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const membership = session.user.memberships[0];
  if (!membership && !session.user.isSuperAdmin) return null;

  let clubId = membership?.clubId;
  let role = (membership?.role ?? "ADMIN") as ClubRoleType;
  let customRoleId = membership?.customRoleId ?? null;

  if (session.user.isSuperAdmin) {
    const viewAsClubId = await getViewAsClubId();
    if (viewAsClubId) {
      clubId = viewAsClubId;
      role = "ADMIN";
      customRoleId = null;
    } else if (!clubId) {
      return null;
    }
  }

  // Two-step query: avoid nested select/include quirks and never pull photo blobs.
  const club = await prisma.club.findUnique({
    where: { id: clubId! },
    include: { subscription: true },
  });

  if (!club) return null;
  if (!club.isActive && !session.user.isSuperAdmin) return null;

  // Replace data-URL logos with media route so the RSC payload stays small.
  if (club.logoUrl?.startsWith("data:")) {
    club.logoUrl = `/api/media/club/${club.id}/logo`;
  }

  let members: Member[] | undefined;
  if (includeMembers) {
    const rows = await prisma.member.findMany({
      where: { clubId: club.id, isActive: true },
      orderBy: { lastName: "asc" },
      select: memberLiteSelect,
    });
    // Satisfy ClubContextClub.members type without loading photoUrl from DB.
    members = rows.map((m) => ({ ...m, photoUrl: null })) as Member[];
  }

  const features = await getClubFeatures(club.id);

  const clubWithMembers: ClubContextClub = members
    ? { ...club, members }
    : club;

  return {
    userId: session.user.id,
    isSuperAdmin: session.user.isSuperAdmin,
    role,
    customRoleId,
    club: clubWithMembers,
    clubId: club.id,
    clubName: club.name,
    features,
  };
}

export const getClubContext = cache(
  async (includeMembers = false): Promise<ClubContext | null> =>
    resolveClubContext(includeMembers)
);

export type { ClubFeatureSet };
