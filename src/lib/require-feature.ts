import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled, type GatedFeature } from "@/lib/feature-gate";

export async function requireFeature(
  feature: GatedFeature,
  options?: { includeMembers?: boolean }
) {
  const ctx = await getClubContext(options?.includeMembers ?? false);
  if (!ctx) return { error: "UNAUTHORIZED" as const };

  if (!isFeatureEnabled(ctx.features, feature, ctx.isSuperAdmin)) {
    return { error: "FEATURE_DISABLED" as const, ctx, feature };
  }

  return { ctx };
}