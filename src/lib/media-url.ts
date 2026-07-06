import { isDataUrl } from "@/lib/image-storage";
import { getAppBaseUrl } from "@/lib/app-url";

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