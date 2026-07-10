"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, Shield, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMenuDrawer } from "@/components/layout/mobile-menu-drawer";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, type AdminNavGroup } from "@/lib/admin-nav-config";

export function AdminMobileHeader({
  title,
  userEmail,
  logoutLabel,
}: {
  title: string;
  userEmail?: string;
  logoutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("adminNav");

  const groupLabels: Record<AdminNavGroup, string> = {
    overview: t("groups.overview"),
    platform: t("groups.platform"),
    billing: t("groups.billing"),
    system: t("groups.system"),
  };

  const drawerItems = ADMIN_NAV_ITEMS.map((item) => ({
    key: item.key,
    href: item.href,
    icon: item.icon,
    label: `${groupLabels[item.group]} · ${t(item.key)}`,
  }));

  return (
    <>
      <header className="lg:hidden sticky top-0 z-50 bg-[var(--admin-sidebar)] text-white border-b border-white/10 safe-top">
        <div className="h-0.5 bg-gold" />
        <div className="flex items-center gap-2 h-14 px-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-white/10 shrink-0"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-gold shrink-0" />
              <p className="text-sm font-semibold truncate">{title}</p>
            </div>
            {userEmail && (
              <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
            )}
          </div>
        </div>
      </header>

      <MobileMenuDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={t("title")}
        subtitle={userEmail ?? t("subtitle")}
        items={drawerItems}
        footer={
          <div className="space-y-2">
            <Link
              href={`/${locale}/dashboard`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
              {t("backToClub")}
            </Link>
            <SignOutButton label={logoutLabel} />
          </div>
        }
      />
    </>
  );
}