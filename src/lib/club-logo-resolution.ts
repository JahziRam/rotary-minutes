import { buildClubDefaultLogoDataUrl } from "@/lib/club-default-logo";
import { getAppBaseUrl } from "@/lib/app-url";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";

export type ClubBrandLogoInput = {
  clubId: string;
  clubName: string;
  logoUrl?: string | null;
  baseUrl?: string;
};

function resolveCustomLogoUrl(input: ClubBrandLogoInput): string | undefined {
  const { clubId, logoUrl, baseUrl } = input;
  if (!logoUrl) return undefined;
  if (isDataUrl(logoUrl)) {
    return resolveClubLogoUrl(clubId, logoUrl, baseUrl) ?? logoUrl;
  }
  return resolveClubLogoUrl(clubId, logoUrl, baseUrl) ?? logoUrl;
}

/** URL d'affichage (navigateur) : logo club ou SVG généré. */
export function resolveClubBrandLogoSrc(input: ClubBrandLogoInput): string {
  return resolveCustomLogoUrl(input) ?? buildClubDefaultLogoDataUrl(input.clubName);
}

/** Endpoint HTTP — sert le logo club ou le SVG généré (PDF, fetch distant). */
export function resolveClubBrandLogoApiUrl(
  clubId: string,
  baseUrl?: string
): string {
  const origin = baseUrl ?? getAppBaseUrl();
  return `${origin}/api/media/club/${clubId}/logo`;
}

/** Indique si le club utilise le logo généré par défaut. */
export function usesDefaultClubLogo(logoUrl?: string | null): boolean {
  return !logoUrl?.trim();
}