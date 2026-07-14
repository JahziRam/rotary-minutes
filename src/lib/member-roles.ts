import "server-only";

import type { ClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";

export {
  DEFAULT_MEMBER_APP_ROLE,
  isNonDefaultAppRole,
} from "@/lib/member-roles-constants";

/** Président, administrateur club ou super admin. */
export async function canManageMemberRoles(ctx: ClubContext): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  return hasRolePermission(ctx.role, "users.manage", false, ctx.customRoleId);
}