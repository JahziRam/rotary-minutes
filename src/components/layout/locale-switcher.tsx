"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  variant = "dark",
  className,
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();

  function hrefFor(target: Locale) {
    const suffix = pathname.replace(new RegExp(`^/${locale}`), "") || "";
    return `/${target}${suffix}`;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border p-0.5",
        variant === "dark" ? "border-white/15" : "border-gray-200 bg-white",
        className
      )}
      role="navigation"
      aria-label="Language"
    >
      {locales.map((loc) => (
        <Link
          key={loc}
          href={hrefFor(loc)}
          title={localeLabels[loc]}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors",
            loc === locale
              ? variant === "dark"
                ? "bg-white/15 text-white"
                : "bg-navy text-white"
              : variant === "dark"
                ? "text-white/60 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
          )}
        >
          {loc}
        </Link>
      ))}
    </div>
  );
}