import { auth } from "@/lib/auth";
import { getClubFeatures } from "@/lib/features";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRoleType } from "@/lib/rotary";

export type TreasuryAccessResult =
  | { ok: true; isSuperAdmin: boolean }
  | { ok: false; status: number; code: string };

export async function assertTreasuryClubAccess(clubId: string): Promise<TreasuryAccessResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, code: "UNAUTHORIZED" };
  }

  if (session.user.isSuperAdmin) {
    return { ok: true, isSuperAdmin: true };
  }

  const membership = session.user.memberships.find((m) => m.clubId === clubId);
  if (!membership) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  const features = await getClubFeatures(clubId);
  if (!isFeatureEnabled(features, "treasuryEnabled", false)) {
    return { ok: false, status: 403, code: "FEATURE_DISABLED" };
  }

  const allowed = await hasRolePermission(
    membership.role as ClubRoleType,
    "treasury.view",
    false
  );
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  return { ok: true, isSuperAdmin: false };
}

export async function assertTreasuryManageAccess(clubId: string): Promise<TreasuryAccessResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, code: "UNAUTHORIZED" };
  }

  if (session.user.isSuperAdmin) {
    return { ok: true, isSuperAdmin: true };
  }

  const membership = session.user.memberships.find((m) => m.clubId === clubId);
  if (!membership) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  const features = await getClubFeatures(clubId);
  if (!isFeatureEnabled(features, "treasuryEnabled", false)) {
    return { ok: false, status: 403, code: "FEATURE_DISABLED" };
  }

  const allowed = await hasRolePermission(
    membership.role as ClubRoleType,
    "treasury.manage",
    false
  );
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  return { ok: true, isSuperAdmin: false };
}