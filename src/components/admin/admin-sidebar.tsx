"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, type AdminNavGroup } from "@/lib/admin-nav-config";
import {
  ClubViewAsSwitcher,
  type ViewAsClubOption,
} from "@/components/layout/club-view-as-switcher";

export function AdminSidebar({
  userEmail,
  logoutLabel,
  isSuperAdmin = false,
  viewAsClubs = [],
  viewAsClubId = null,
  shellLocale = "fr",
}: {
  userEmail?: string;
  logoutLabel: string;
  isSuperAdmin?: boolean;
  viewAsClubs?: ViewAsClubOption[];
  viewAsClubId?: string | null;
  shellLocale?: string;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("adminNav");

  const groupLabels: Record<AdminNavGroup, string> = {
    overview: t("groups.overview"),
    platform: t("groups.platform"),
    billing: t("groups.billing"),
    system: t("groups.system"),
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[var(--admin-sidebar-w)] lg:fixed lg:inset-y-0 bg-[var(--admin-sidebar)] text-white border-r border-white/10">
      <div className="h-1 bg-gold shrink-0" />
      <div className="flex flex-col h-full">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-gold mb-2">
            <Shield className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {t("badge")}
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-white">{t("title")}</h1>
          <p className="text-xs text-white/50 mt-1">{t("subtitle")}</p>
          {userEmail && (
            <p className="text-[10px] text-white/40 mt-2 truncate">{userEmail}</p>
          )}
        </div>

        {isSuperAdmin && (
          <ClubViewAsSwitcher
            clubs={viewAsClubs}
            currentClubId={viewAsClubId}
            locale={shellLocale}
            variant="sidebar"
            className="border-b border-white/10"
          />
        )}

        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {ADMIN_NAV_GROUPS.map((group) => {
            const items = ADMIN_NAV_ITEMS.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  {groupLabels[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map(({ key, href, icon: Icon, exact }) => {
                    const full = `/${locale}${href}`;
                    const active = exact
                      ? pathname === full
                      : pathname.startsWith(full);
                    return (
                      <Link
                        key={key}
                        href={full}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-gold/20 text-gold"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {t(key)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t("backToClub")}
          </Link>
          <LocaleSwitcher variant="dark" className="w-full justify-center" />
          <SignOutButton label={logoutLabel} />
        </div>
      </div>
    </aside>
  );
}