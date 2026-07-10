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

async function resolveClubContext(includeMembers: boolean): Promise<ClubContext | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const membership = session.user.memberships[0];
  if (!membership && !session.user.isSuperAdmin) return null;

  let clubId = membership?.clubId;
  let role = (membership?.role ?? "ADMIN") as ClubRoleType;
  let customRoleId = membership?.customRoleId ?? null;

  if (!clubId && session.user.isSuperAdmin) {
    const viewAsClubId = await getViewAsClubId();
    if (!viewAsClubId) return null;
    clubId = viewAsClubId;
    role = "ADMIN";
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId! },
    include: {
      subscription: true,
      ...(includeMembers
        ? { members: { where: { isActive: true }, orderBy: { lastName: "asc" } } }
        : {}),
    },
  });

  if (!club) return null;
  if (!club.isActive && !session.user.isSuperAdmin) return null;

  const features = await getClubFeatures(club.id);

  return {
    userId: session.user.id,
    isSuperAdmin: session.user.isSuperAdmin,
    role,
    customRoleId,
    club,
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