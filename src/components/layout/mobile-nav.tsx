"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Home, Calendar, FileText, Mail, Users, BarChart3, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: Home },
  { href: "/notifications", icon: Bell },
  { href: "/meetings", icon: Calendar },
  { href: "/minutes", icon: FileText },
  { href: "/members", icon: Users },
  { href: "/statistics", icon: BarChart3 },
  { href: "/emails", icon: Mail },
  { href: "/settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-center justify-around h-[var(--bottom-nav-h)] px-1">
        {items.map(({ href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = pathname.startsWith(fullHref);
          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors",
                isActive ? "text-navy" : "text-gray-400"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-gold")} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}