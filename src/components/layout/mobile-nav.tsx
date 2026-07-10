"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getMobileTabItems } from "@/lib/nav-config";
import { Badge } from "@/components/ui/badge";

export function MobileNav({
  hiddenNavKeys = [],
  notificationCount = 0,
}: {
  hiddenNavKeys?: string[];
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");

  const items = getMobileTabItems().filter((item) => !hiddenNavKeys.includes(item.key));

  if (pathname.includes("/admin")) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] safe-bottom"
      aria-label={t("mobileTabs")}
    >
      <div
        className="grid h-[var(--bottom-nav-h)] px-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))` }}
      >
        {items.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = pathname.startsWith(fullHref);
          const badge = key === "notifications" ? notificationCount : 0;
          return (
            <Link
              key={href}
              href={fullHref}
              data-guide={key}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 transition-colors",
                isActive ? "text-navy" : "text-gray-400"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-gold")} />
                {badge > 0 && (
                  <Badge
                    variant="danger"
                    className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[9px] leading-none"
                  >
                    {badge > 9 ? "9+" : badge}
                  </Badge>
                )}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium truncate max-w-full px-0.5",
                  isActive && "text-navy font-semibold"
                )}
              >
                {t(key === "dashboard" ? "dashboard" : key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}