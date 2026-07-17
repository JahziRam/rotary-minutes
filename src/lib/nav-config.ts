import type { LucideIcon } from "lucide-react";
import {
  Home,
  Calendar,
  FileText,
  Mail,
  Users,
  BarChart3,
  Map,
  Settings,
  Bell,
  LifeBuoy,
  UserCircle,
  ClipboardList,
  PartyPopper,
  FolderOpen,
  Wallet,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  ListTodo,
  PieChart,
  UsersRound,
} from "lucide-react";

export type ClubNavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  /** Affiché dans la barre de navigation mobile basse */
  mobileTab?: boolean;
};

export type ClubNavGroup = {
  /** null = items au premier niveau sans en-tête de groupe */
  id: string | null;
  items: ClubNavItem[];
};

/**
 * Navigation club structurée par groupes.
 * Source unique pour sidebar (groupes), drawer et bottom nav (aplatie).
 */
export const CLUB_NAV_GROUPS: ClubNavGroup[] = [
  {
    id: null,
    items: [
      { key: "dashboard", href: "/dashboard", icon: Home, mobileTab: true },
      { key: "notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    id: "clubLife",
    items: [
      { key: "meetings", href: "/meetings", icon: Calendar, mobileTab: true },
      { key: "minutes", href: "/minutes", icon: FileText, mobileTab: true },
      { key: "members", href: "/members", icon: Users, mobileTab: true },
      { key: "commissions", href: "/members/commissions", icon: UsersRound },
      { key: "dues", href: "/members/dues", icon: Wallet },
      { key: "events", href: "/events", icon: PartyPopper },
      { key: "calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    id: "work",
    items: [
      { key: "myWork", href: "/my-work", icon: ListTodo },
      { key: "projects", href: "/projects", icon: FolderKanban },
      { key: "actions", href: "/actions", icon: CheckSquare },
      { key: "attendanceReports", href: "/attendance-reports", icon: ClipboardList },
      { key: "statistics", href: "/statistics", icon: BarChart3 },
    ],
  },
  {
    id: "finance",
    items: [
      { key: "treasury", href: "/treasury", icon: Wallet },
      { key: "treasuryPlan", href: "/treasury/mandate-plan", icon: PieChart },
    ],
  },
  {
    id: "tools",
    items: [
      { key: "emails", href: "/emails", icon: Mail },
      { key: "documents", href: "/documents", icon: FolderOpen },
      { key: "district", href: "/district", icon: Map },
    ],
  },
  {
    id: "account",
    items: [
      { key: "myAccount", href: "/my-account", icon: UserCircle, mobileTab: true },
      { key: "settings", href: "/settings", icon: Settings },
      { key: "support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** Liste plate (compatibilité bottom nav, tests, feature flags). */
export const CLUB_NAV_ITEMS: ClubNavItem[] = CLUB_NAV_GROUPS.flatMap(
  (group) => group.items
);

export function getVisibleNavGroups(
  hiddenNavKeys: string[] = [],
  options?: { showDistrictNav?: boolean }
): ClubNavGroup[] {
  const showDistrict = options?.showDistrictNav ?? true;
  return CLUB_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.key === "district" && !showDistrict) return false;
      return !hiddenNavKeys.includes(item.key);
    }),
  })).filter((group) => group.items.length > 0);
}

export function getMobileTabItems(hiddenNavKeys: string[] = []): ClubNavItem[] {
  const tabs = CLUB_NAV_ITEMS.filter((item) => item.mobileTab);
  const visible = tabs.filter((item) => !hiddenNavKeys.includes(item.key));

  if (visible.length <= 4) return visible.slice(0, 4);

  if (hiddenNavKeys.includes("members") && !hiddenNavKeys.includes("myAccount")) {
    return visible
      .filter((item) => item.key !== "members")
      .slice(0, 4);
  }

  return visible.slice(0, 4);
}

export function isNavItemActive(pathname: string, locale: string, href: string): boolean {
  const fullHref = `/${locale}${href}`;
  if (pathname === fullHref) return true;
  // Exact-ish match for nested routes, but avoid /members matching /members/dues when both shown
  if (href === "/members") {
    return (
      pathname === fullHref ||
      (pathname.startsWith(`${fullHref}/`) &&
        !pathname.startsWith(`/${locale}/members/dues`) &&
        !pathname.startsWith(`/${locale}/members/commissions`))
    );
  }
  if (href === "/treasury") {
    return (
      pathname === fullHref ||
      (pathname.startsWith(`${fullHref}/`) &&
        !pathname.startsWith(`/${locale}/treasury/mandate-plan`))
    );
  }
  return pathname.startsWith(`${fullHref}/`) || pathname.startsWith(fullHref);
}
