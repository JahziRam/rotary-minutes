import { ROTARY_BRAND, ROTARY_LOGO_CLEAR_SPACE_CLASS } from "@/lib/rotary-brand";
import { cn } from "@/lib/utils";

/** Club logo — contain (no crop). Variant brand = charte Rotary (espace, pas de rognage circulaire). */
export function ClubLogo({
  src,
  alt = "",
  size = "md",
  variant = "app",
  className,
}: {
  src: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  /** app = avatar sidebar ; brand = PV / documents (logo club complet) */
  variant?: "app" | "brand";
  className?: string;
}) {
  if (variant === "brand") {
    const maxH =
      size === "sm" ? "max-h-12" : size === "lg" ? "max-h-[72px]" : "max-h-14";
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
          alt={alt}
          className={cn("w-auto object-contain", maxH, "max-w-[280px]")}
        />
      </div>
    );
  }

  const box =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-14 w-14";
  return (
    <div
      className={cn(
        "rounded-full bg-navy flex items-center justify-center shrink-0 overflow-hidden p-1",
        box,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}