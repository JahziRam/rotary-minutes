"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getMobileTabItems } from "@/lib/nav-config";
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

  const items = getMobileTabItems(hiddenNavKeys);

  if (pathname.includes("/admin")) return null;

  return (
    <nav className="mobile-tab-bar lg:hidden" aria-label={t("mobileTabs")}>
      <div
        className="mobile-tab-bar__grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
      >
        {items.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = pathname.startsWith(fullHref);
          return (
            <Link
              key={href}
              href={fullHref}
              data-guide={key}
              className={cn("mobile-tab-item", isActive && "mobile-tab-item--active")}
            >
              <span className="mobile-tab-icon-wrap">
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={isActive ? 2.25 : 2} />
              </span>
              <span className="mobile-tab-label">
                {t(key === "dashboard" ? "dashboard" : key)}
              </span>
            </Link>
          );
        })}
      </div>
      {notificationCount > 0 && (
        <span className="sr-only">
          {notificationCount} {t("notifications")}
        </span>
      )}
    </nav>
  );
}