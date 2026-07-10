"use client";

import { useState } from "react";
import {
  Home,
  Calendar,
  CalendarDays,
  FileText,
  Mail,
  Users,
  BarChart3,
  Map,
  Settings,
  Bell,
  Shield,
  LifeBuoy,
  CreditCard,
  Menu,
  Wallet,
  CheckSquare,
  UserCircle,
  ClipboardList,
  PartyPopper,
  FolderOpen,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Header, type HeaderNotification } from "./header";
import { MobileMenuDrawer } from "./mobile-menu-drawer";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UsageGuideLauncher } from "@/components/assistant/usage-guide-launcher";
import { useAppBranding } from "@/components/brand/app-branding-provider";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: Home },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "meetings", href: "/meetings", icon: Calendar },
  { key: "minutes", href: "/minutes", icon: FileText },
  { key: "emails", href: "/emails", icon: Mail },
  { key: "members", href: "/members", icon: Users },
  { key: "myAccount", href: "/my-account", icon: UserCircle },
  { key: "attendanceReports", href: "/attendance-reports", icon: ClipboardList },
  { key: "events", href: "/events", icon: PartyPopper },
  { key: "documents", href: "/documents", icon: FolderOpen },
  { key: "treasury", href: "/treasury", icon: Wallet },
  { key: "actions", href: "/actions", icon: CheckSquare },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "statistics", href: "/statistics", icon: BarChart3 },
  { key: "district", href: "/district", icon: Map },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "support", href: "/support", icon: LifeBuoy },
] as const;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { appName } = useAppBranding();

  const drawerItems = [
    ...(isSuperAdmin
      ? [{ key: "admin", href: "/admin", icon: Shield, label: "Super Admin" }]
      : []),
    ...navItems
      .filter((item) => !hiddenNavKeys?.includes(item.key))
      .map((item) => ({
        ...item,
        label: t(item.key === "dashboard" ? "dashboard" : item.key),
        locked: lockedNavKeys?.includes(item.key),
        badge: item.key === "notifications" ? notificationCount : undefined,
      })),
  ];

  return (
    <>
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 h-14 px-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 shrink-0"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-navy" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            {clubName && (
              <p className="text-[10px] text-gray-500 truncate">{clubName}</p>
            )}
          </div>
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