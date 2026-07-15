import { ClubLogo } from "@/components/ui/club-logo";
import { ClubBrandFallback } from "@/components/brand/club-brand-fallback";
import { resolveClubBrandLogoSrc, usesDefaultClubLogo } from "@/lib/club-logo-resolution";
import { ROTARY_BRAND } from "@/lib/rotary-brand";

export function ClubDocumentHeader({
  clubId,
  clubName,
  logoUrl,
  address,
  district,
  country,
}: {
  clubId?: string;
  clubName: string;
  logoUrl?: string | null;
  address?: string | null;
  district?: string | null;
  country?: string | null;
}) {
  const districtLine = [district ? `District ${district}` : null, country]
    .filter(Boolean)
    .join(" • ");

  const brandLogoSrc = clubId
    ? resolveClubBrandLogoSrc({ clubId, clubName, logoUrl })
    : null;
  const logoIsGenerated = usesDefaultClubLogo(logoUrl);

  return (
    <div className="border-b border-[#E2E8F0] pb-5">
      <div
        className="h-1 rounded-full mb-5"
        style={{
          background: `linear-gradient(90deg, ${ROTARY_BRAND.royalBlue} 0%, ${ROTARY_BRAND.gold} 100%)`,
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {brandLogoSrc ? (
          <ClubLogo src={brandLogoSrc} alt={clubName} size="lg" variant="brand" />
        ) : (
          <ClubBrandFallback clubName={clubName} size="lg" />
        )}
        <div className="min-w-0 flex-1">
          {!logoIsGenerated ? (
            <h2
              className="font-bold text-lg leading-tight"
              style={{ color: ROTARY_BRAND.royalBlue }}
            >
              {clubName}
            </h2>
          ) : null}
          {address && (
            <p className="text-sm mt-1" style={{ color: ROTARY_BRAND.muted }}>
              {address}
            </p>
          )}
          {districtLine && (
            <p className="text-sm mt-0.5" style={{ color: ROTARY_BRAND.muted }}>
              {districtLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}