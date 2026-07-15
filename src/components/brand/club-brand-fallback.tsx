import { buildClubDefaultLogoDataUrl } from "@/lib/club-default-logo";
import { ROTARY_LOGO_CLEAR_SPACE_CLASS } from "@/lib/rotary-brand";
import { cn } from "@/lib/utils";

/**
 * Logo club généré lorsqu'aucun logo officiel n'est configuré.
 * Template Brand Center : roue + nom du club + « Rotary » (non traduit).
 */
export function ClubBrandFallback({
  clubName,
  className,
  size = "md",
}: {
  clubName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const maxH =
    size === "sm" ? "max-h-12" : size === "lg" ? "max-h-[72px]" : "max-h-14";
  const src = buildClubDefaultLogoDataUrl(clubName);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        ROTARY_LOGO_CLEAR_SPACE_CLASS,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={clubName}
        className={cn("w-auto object-contain", maxH, "max-w-[280px]")}
      />
    </div>
  );
}