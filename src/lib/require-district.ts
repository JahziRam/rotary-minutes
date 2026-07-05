import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import {
  getUserDistrictAccesses,
  type DistrictAccessInfo,
} from "@/lib/district-access";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";

export async function requireDistrictPage(district?: string) {
  const session = await auth();
  if (!session?.user) return { error: "UNAUTHORIZED" as const };

  const ctx = await getClubContext();
  const accesses = await getUserDistrictAccesses(session.user.id);
  const isSuperAdmin = session.user.isSuperAdmin;

  const hasDistrictAccess = accesses.length > 0;
  const featureEnabled =
    !!ctx && isFeatureEnabled(ctx.features, "districtDashboard", isSuperAdmin);
  const featureVisible =
    !!ctx && isFeatureVisibleInUi(ctx.features, "districtDashboard", isSuperAdmin);

  if (!isSuperAdmin && !hasDistrictAccess && !featureEnabled && !featureVisible) {
    return { error: "UNAUTHORIZED" as const };
  }

  if (!isSuperAdmin && !hasDistrictAccess && !featureEnabled && featureVisible) {
    return { error: "FEATURE_DISABLED" as const, ctx };
  }

  let targetDistrict = district;
  if (!targetDistrict) {
    if (accesses.length > 0) {
      targetDistrict = accesses[0].district;
    } else if (ctx?.club.district) {
      targetDistrict = ctx.club.district;
    }
  }

  if (!targetDistrict) return { error: "NO_DISTRICT" as const };

  if (!isSuperAdmin && district) {
    const allowedByAccess = accesses.some((a) => a.district === district);
    const allowedByClub =
      !!ctx &&
      ctx.club.district === district &&
      isFeatureEnabled(ctx.features, "districtDashboard", false);
    if (!allowedByAccess && !allowedByClub) {
      return { error: "FORBIDDEN" as const };
    }
  }

  return {
    session: session.user,
    accesses,
    district: targetDistrict,
    ctx,
    isSuperAdmin,
  };
}

export type DistrictPageContext = {
  session: { id: string; isSuperAdmin: boolean };
  accesses: DistrictAccessInfo[];
  district: string;
  ctx: Awaited<ReturnType<typeof getClubContext>>;
  isSuperAdmin: boolean;
};