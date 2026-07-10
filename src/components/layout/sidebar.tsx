"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Shield, Lock, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { cn } from "@/lib/utils";
import { UsageGuideLauncher } from "@/components/assistant/usage-guide-launcher";
import { AppBrandName } from "@/components/brand/app-brand-name";
import { CLUB_NAV_ITEMS } from "@/lib/nav-config";
import { ClubViewAsSwitcher, type ViewAsClubOption } from "./club-view-as-switcher";

export function Sidebar({
  clubName,
  isSuperAdmin = false,
  isViewingAsClub = false,
  viewAsClubs = [],
  viewAsClubId = null,
  shellLocale = "fr",
  hiddenNavKeys = [],
  userRole,
  notificationCount = 0,
  lockedNavKeys = [],
  canManageSubscription = false,
  subscriptionPlan,
  showDistrictNav = false,
  showUsageGuide = false,
}: {
  clubName?: string;
  isSuperAdmin?: boolean;
  isViewingAsClub?: boolean;
  viewAsClubs?: ViewAsClubOption[];
  viewAsClubId?: string | null;
  shellLocale?: string;
  hiddenNavKeys?: string[];
  lockedNavKeys?: string[];
  userRole?: string;
  notificationCount?: number;
  canManageSubscription?: boolean;
  subscriptionPlan?: string;
  showDistrictNav?: boolean;
  showUsageGuide?: boolean;
}) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[var(--sidebar-w)] lg:fixed lg:inset-y-0 bg-navy-dark text-white">
      <div className="h-1 bg-gold" />
      <div className="flex flex-col h-full">
        <div className="p-5 border-b border-white/10">
          <Link href={`/${locale}/dashboard`} className="block">
            <h1 className="font-display text-xl font-bold text-white">
              <AppBrandName />
            </h1>
            {clubName && (
              <p className="text-xs text-white/60 mt-1 truncate">{clubName}</p>
            )}
            {userRole && (!isSuperAdmin || isViewingAsClub) && (
              <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">{userRole}</p>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {isSuperAdmin && (
            <>
              <Link
                href={`/${locale}/admin`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2",
                  pathname.startsWith(`/${locale}/admin`)
                    ? "bg-gold/20 text-gold"
                    : "text-gold/80 hover:bg-gold/10 hover:text-gold"
                )}
              >
                <Shield className="h-5 w-5 shrink-0" />
                {t("superAdmin")}
              </Link>
              <ClubViewAsSwitcher
                clubs={viewAsClubs}
                currentClubId={viewAsClubId}
                locale={shellLocale}
                className="mb-3"
              />
            </>
          )}
          {CLUB_NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            if (key === "district" && !showDistrictNav) return null;
            if (hiddenNavKeys.includes(key)) return null;
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);
            const isLocked = lockedNavKeys.includes(key);
            return (
              <Link
                key={key}
                href={fullHref}
                data-guide={key}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-gold"
                    : isLocked
                      ? "text-white/50 hover:bg-white/5"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">
                  {t(key === "dashboard" ? "dashboard" : key)}
                </span>
                {isLocked && <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                {key === "notifications" && notificationCount > 0 && (
                  <Badge variant="danger" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {notificationCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          {canManageSubscription && (
            <Link
              href={`/${locale}/settings/subscription`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                pathname.startsWith(`/${locale}/settings/subscription`)
                  ? "bg-gold/20 text-gold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <CreditCard className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  {t("subscription")}
                </p>
                <p className="font-medium truncate">{subscriptionPlan ?? "TRIAL"}</p>
                <p className="text-xs text-gold/90">{t("changePlan")}</p>
              </div>
            </Link>
          )}
          {showUsageGuide && <UsageGuideLauncher variant="sidebar" />}
          <LocaleSwitcher variant="dark" className="w-full justify-center" />
          <SignOutButton label={tAuth("logout")} />
        </div>
      </div>
    </aside>
  );
}