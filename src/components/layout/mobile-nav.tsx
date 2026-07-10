"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Wallet,
  CheckSquare,
  CalendarDays,
  UserCircle,
  PartyPopper,
  FolderOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const items = [
  { key: "dashboard", href: "/dashboard", icon: Home },
  { key: "meetings", href: "/meetings", icon: Calendar },
  { key: "myAccount", href: "/my-account", icon: UserCircle },
  { key: "events", href: "/events", icon: PartyPopper },
  { key: "documents", href: "/documents", icon: FolderOpen },
  { key: "treasury", href: "/treasury", icon: Wallet },
  { key: "actions", href: "/actions", icon: CheckSquare },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "members", href: "/members", icon: Users },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] safe-bottom">
      <div className="flex items-stretch justify-around h-[var(--bottom-nav-h)] px-0.5">
        {items.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = pathname.startsWith(fullHref);
          return (
            <Link
              key={href}
              href={fullHref}
              data-guide={key}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 transition-colors",
                isActive ? "text-navy" : "text-gray-400"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive && "text-gold"
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-medium truncate max-w-full px-0.5",
                  isActive && "text-navy"
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