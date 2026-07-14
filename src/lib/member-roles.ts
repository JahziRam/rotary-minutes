import type { ClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";

/** Président, administrateur club ou super admin. */
export async function canManageMemberRoles(ctx: ClubContext): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  return hasRolePermission(ctx.role, "users.manage", false, ctx.customRoleId);
}