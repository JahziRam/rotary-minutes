import type { ClubRoleType } from "@/lib/rotary";

/** Rôle applicatif par défaut pour tout nouvel accès club. */
export const DEFAULT_MEMBER_APP_ROLE = "READER" as const satisfies ClubRoleType;

export function isNonDefaultAppRole(
  role: ClubRoleType,
  customRoleId?: string | null
): boolean {
  return role !== DEFAULT_MEMBER_APP_ROLE || Boolean(customRoleId);
}