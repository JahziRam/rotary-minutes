import { auth } from "@/lib/auth";
import { getClubFeatures } from "@/lib/features";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRoleType } from "@/lib/rotary";

export type DocumentAccessResult =
  | { ok: true; isSuperAdmin: boolean }
  | { ok: false; status: number; code: string };

export async function assertDocumentClubAccess(clubId: string): Promise<DocumentAccessResult> {
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
  if (!isFeatureEnabled(features, "documentsEnabled", false)) {
    return { ok: false, status: 403, code: "FEATURE_DISABLED" };
  }

  const allowed = await hasRolePermission(
    membership.role as ClubRoleType,
    "documents.view",
    false
  );
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  return { ok: true, isSuperAdmin: false };
}

export async function assertDocumentManageAccess(clubId: string): Promise<DocumentAccessResult> {
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
  if (!isFeatureEnabled(features, "documentsEnabled", false)) {
    return { ok: false, status: 403, code: "FEATURE_DISABLED" };
  }

  const allowed = await hasRolePermission(
    membership.role as ClubRoleType,
    "documents.manage",
    false
  );
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  return { ok: true, isSuperAdmin: false };
}

/** Pièces jointes PV : accès via permission minutes.view, sans module Documents. */
export async function assertMinuteAttachmentClubAccess(
  clubId: string
): Promise<DocumentAccessResult> {
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

  const allowed = await hasRolePermission(
    membership.role as ClubRoleType,
    "minutes.view",
    false
  );
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }

  return { ok: true, isSuperAdmin: false };
}