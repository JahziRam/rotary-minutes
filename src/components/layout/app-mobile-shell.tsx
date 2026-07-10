"use client";

import { useState } from "react";
import { Shield, CreditCard, Menu, Bell } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header, type HeaderNotification } from "./header";
import { MobileMenuDrawer } from "./mobile-menu-drawer";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UsageGuideLauncher } from "@/components/assistant/usage-guide-launcher";
import { useAppBranding } from "@/components/brand/app-branding-provider";
import { CLUB_NAV_ITEMS } from "@/lib/nav-config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AppMobileShell({
  title,
  clubName,
  notificationCount,
  notifications,
  isSuperAdmin,
  hiddenNavKeys,
  lockedNavKeys,
  canManageSubscription,
  subscriptionPlan,
  showUsageGuide = false,
  children,
}: {
  title: string;
  clubName?: string;
  notificationCount?: number;
  notifications?: HeaderNotification[];
  isSuperAdmin?: boolean;
  hiddenNavKeys?: string[];
  lockedNavKeys?: string[];
  canManageSubscription?: boolean;
  subscriptionPlan?: string;
  showUsageGuide?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { appName } = useAppBranding();

  const drawerItems = [
    ...(isSuperAdmin
      ? [{ key: "admin", href: "/admin", icon: Shield, label: t("superAdmin") }]
      : []),
    ...CLUB_NAV_ITEMS.filter((item) => !hiddenNavKeys?.includes(item.key)).map((item) => ({
      ...item,
      label: t(item.key === "dashboard" ? "dashboard" : item.key),
      locked: lockedNavKeys?.includes(item.key),
      badge: item.key === "notifications" ? notificationCount : undefined,
    })),
  ];

  const notifHref = `/${locale}/notifications`;
  const onNotifications = pathname.startsWith(notifHref);

  return (
    <>
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 safe-top">
        <div className="flex items-center gap-1 h-14 px-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 shrink-0"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5 text-navy" />
          </button>
          <div className="flex-1 min-w-0 px-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{title}</p>
            {clubName && (
              <p className="text-[10px] text-gray-500 truncate">{clubName}</p>
            )}
          </div>
          <Link
            href={notifHref}
            className={cn(
              "relative p-2 rounded-xl shrink-0 transition-colors",
              onNotifications ? "bg-navy/10 text-navy" : "hover:bg-gray-100 text-gray-600"
            )}
            aria-label={t("notifications")}
          >
            <Bell className="h-5 w-5" />
            {(notificationCount ?? 0) > 0 && (
              <Badge
                variant="danger"
                className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[9px] leading-none"
              >
                {(notificationCount ?? 0) > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Link>
          {showUsageGuide && <UsageGuideLauncher variant="header" />}
        </div>
      </div>
      <div className="hidden lg:block">
        <Header
          title={title}
          notificationCount={notificationCount}
          notifications={notifications}
          showUsageGuide={showUsageGuide}
        />
      </div>
      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={appName}
        subtitle={clubName}
        items={drawerItems}
        footer={
          <div className="space-y-2">
            {canManageSubscription && (
              <Link
                href={`/${locale}/settings/subscription`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10"
              >
                <CreditCard className="h-5 w-5" />
                <span>
                  {subscriptionPlan ?? "TRIAL"} — {t("changePlan")}
                </span>
              </Link>
            )}
            <SignOutButton label={tAuth("logout")} />
          </div>
        }
      />
      {children}
    </>
  );
}