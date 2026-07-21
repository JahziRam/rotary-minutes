import { isDataUrl } from "@/lib/image-storage";
import { getAppBaseUrl } from "@/lib/app-url";

/** Default member avatar (Rotary wheel) when no custom profile photo. */
export const MEMBER_DEFAULT_AVATAR_PATH = "/brand/member-default-avatar.png";

export function resolveClubLogoUrl(
  clubId: string,
  logoUrl: string | null | undefined,
  baseUrl?: string
): string | undefined {
  if (!logoUrl) return undefined;
  if (isDataUrl(logoUrl)) {
    const origin = baseUrl ?? getAppBaseUrl();
    return `${origin}/api/media/club/${clubId}/logo`;
  }
  return logoUrl;
}

export function resolveMemberPhotoUrl(
  memberId: string,
  photoUrl: string | null | undefined,
  baseUrl?: string
): string | undefined {
  if (!photoUrl) return undefined;
  if (isDataUrl(photoUrl)) {
    const origin = baseUrl ?? getAppBaseUrl();
    return `${origin}/api/media/member/${memberId}/photo`;
  }
  return photoUrl;
}

/**
 * Member photo for display, with default avatar (roue) when none is set.
 */
export function resolveMemberPhotoUrlOrDefault(
  memberId: string | null | undefined,
  photoUrl: string | null | undefined,
  baseUrl?: string
): string {
  if (photoUrl?.trim() && memberId) {
    return (
      resolveMemberPhotoUrl(memberId, photoUrl, baseUrl) ?? photoUrl.trim()
    );
  }
  if (photoUrl?.trim() && !isDataUrl(photoUrl)) {
    return photoUrl.trim();
  }
  return MEMBER_DEFAULT_AVATAR_PATH;
}