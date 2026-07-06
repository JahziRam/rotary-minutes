import { cn } from "@/lib/utils";

/** Club logo — contain (no crop), centered in a square frame */
export function ClubLogo({
  src,
  alt = "",
  size = "md",
  className,
}: {
  src: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
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