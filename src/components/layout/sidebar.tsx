"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Shield, Lock, CreditCard, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { cn } from "@/lib/utils";
import { UsageGuideLauncher } from "@/components/assistant/usage-guide-launcher";
import { AppBrandName } from "@/components/brand/app-brand-name";
import {
  getVisibleNavGroups,
  isNavItemActive,
  type ClubNavItem,
} from "@/lib/nav-config";
import { ClubViewAsSwitcher, type ViewAsClubOption } from "./club-view-as-switcher";

const STORAGE_KEY = "rotary-sidebar-groups";

function navLabelKey(key: string): string {
  return key === "dashboard" ? "dashboard" : key;
}

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

  const groups = useMemo(
    () => getVisibleNavGroups(hiddenNavKeys, { showDistrictNav }),
    [hiddenNavKeys, showDistrictNav]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setOpenGroups(JSON.parse(raw) as Record<string, boolean>);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Auto-open group containing active route
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const group of groups) {
        if (!group.id) continue;
        const hasActive = group.items.some((item) =>
          isNavItemActive(pathname, locale, item.href)
        );
        if (hasActive && next[group.id] !== true) {
          next[group.id] = true;
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, locale, groups]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !isGroupOpen(id, prev) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function isGroupOpen(id: string, state: Record<string, boolean> = openGroups) {
    if (state[id] !== undefined) return state[id];
    // Default: open groups with active item, else open first time
    return true;
  }

  function renderItem(item: ClubNavItem) {
    const { key, href, icon: Icon } = item;
    const fullHref = `/${locale}${href}`;
    const isActive = isNavItemActive(pathname, locale, href);
    const isLocked = lockedNavKeys.includes(key);
    return (
      <Link
        key={key}
        href={fullHref}
        data-guide={key}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-white/15 text-gold"
            : isLocked
              ? "text-white/50 hover:bg-white/5"
              : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0 h-[18px] w-[18px]" />
        <span className="flex-1 truncate">{t(navLabelKey(key))}</span>
        {isLocked && <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
        {key === "notifications" && notificationCount > 0 && (
          <Badge variant="danger" className="h-5 min-w-5 px-1.5 text-[10px]">
            {notificationCount}
          </Badge>
        )}
      </Link>
    );
  }

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
              <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">
                {userRole}
              </p>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {isSuperAdmin && (
            <>
              <Link
                href={`/${locale}/admin`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
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
                className="mb-2"
              />
            </>
          )}

          {groups.map((group) => {
            if (!group.id) {
              return (
                <div key="top" className="space-y-0.5">
                  {group.items.map(renderItem)}
                </div>
              );
            }

            const open = isGroupOpen(group.id);
            const groupHasActive = group.items.some((item) =>
              isNavItemActive(pathname, locale, item.href)
            );

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id!)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    groupHasActive
                      ? "text-gold/90"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  <span className="flex-1 text-left">
                    {t(`groups.${group.id}`)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      open ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {open && (
                  <div className="space-y-0.5 pl-0.5">{group.items.map(renderItem)}</div>
                )}
              </div>
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
