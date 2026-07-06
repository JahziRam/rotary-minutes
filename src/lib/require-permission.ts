import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import type { Permission } from "@/lib/permissions";

export async function requirePermission(permission: Permission) {
  const ctx = await getClubContext();
  if (!ctx) return { error: "UNAUTHORIZED" as const };
  if (ctx.isSuperAdmin) return { ctx };

  const allowed = await hasRolePermission(ctx.role, permission, false);
  if (!allowed) return { error: "FORBIDDEN" as const };

  return { ctx };
}

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return { error: "UNAUTHORIZED" as const };
  return {
    ctx: {
      userId: session.user.id,
      isSuperAdmin: true as const,
    },
  };
}