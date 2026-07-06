import { isDataUrl } from "@/lib/image-storage";

export function resolveClubLogoUrl(
  clubId: string,
  logoUrl: string | null | undefined,
  baseUrl?: string
): string | undefined {
  if (!logoUrl) return undefined;
  if (isDataUrl(logoUrl)) {
    const origin = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
    const origin = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${origin}/api/media/member/${memberId}/photo`;
  }
  return photoUrl;
}