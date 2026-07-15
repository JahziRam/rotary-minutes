import type { ClubFeatureSet } from "@/lib/feature-definitions";
import { isFeatureEnabled } from "@/lib/feature-gate";
import {
  countMinuteAiUsageThisMonth,
  getMinuteAiPlatformConfig,
  isMinuteAiApiConfigured,
} from "@/lib/minute-ai-config";

export type MinuteAiAccessError =
  | "FEATURE_DISABLED"
  | "GLOBALLY_DISABLED"
  | "API_KEY_MISSING"
  | "QUOTA_EXCEEDED";

export type MinuteAiAccessResult =
  | {
      ok: true;
      remaining: number;
      quota: number;
    }
  | {
      ok: false;
      error: MinuteAiAccessError;
      remaining: number;
      quota: number;
    };

export async function resolveMinuteAiAccess(
  clubId: string,
  features: ClubFeatureSet,
  isSuperAdmin: boolean
): Promise<MinuteAiAccessResult> {
  const platform = await getMinuteAiPlatformConfig();
  const usage = await countMinuteAiUsageThisMonth(clubId);
  const quota = Math.max(1, platform.monthlyQuotaPerClub);
  const remaining = Math.max(0, quota - usage);

  if (!isMinuteAiApiConfigured()) {
    return { ok: false, error: "API_KEY_MISSING", remaining, quota };
  }

  if (!platform.globallyEnabled) {
    return { ok: false, error: "GLOBALLY_DISABLED", remaining, quota };
  }

  if (!isFeatureEnabled(features, "minuteAiAssistEnabled", isSuperAdmin)) {
    return { ok: false, error: "FEATURE_DISABLED", remaining, quota };
  }

  if (!isSuperAdmin && remaining <= 0) {
    return { ok: false, error: "QUOTA_EXCEEDED", remaining: 0, quota };
  }

  return { ok: true, remaining: isSuperAdmin ? quota : remaining, quota };
}