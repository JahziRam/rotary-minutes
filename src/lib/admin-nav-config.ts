import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Megaphone,
  Settings,
  Download,
  CreditCard,
  LifeBuoy,
  Flag,
  Mail,
} from "lucide-react";

export type AdminNavGroup = "overview" | "platform" | "billing" | "system";

export type AdminNavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  exact?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: "overview", href: "/admin", icon: LayoutDashboard, group: "overview", exact: true },
  { key: "clubs", href: "/admin/clubs", icon: Building2, group: "platform" },
  { key: "users", href: "/admin/users", icon: Users, group: "platform" },
  { key: "billing", href: "/admin/billing", icon: CreditCard, group: "billing" },
  { key: "subscriptions", href: "/admin/subscriptions", icon: CreditCard, group: "billing" },
  { key: "roles", href: "/admin/roles", icon: Shield, group: "platform" },
  { key: "announcements", href: "/admin/announcements", icon: Megaphone, group: "platform" },
  { key: "support", href: "/admin/support", icon: LifeBuoy, group: "platform" },
  { key: "contacts", href: "/admin/contacts", icon: Mail, group: "platform" },
  { key: "featureFlags", href: "/admin/feature-flags", icon: Flag, group: "system" },
  { key: "settings", href: "/admin/settings", icon: Settings, group: "system" },
  { key: "export", href: "/admin/export", icon: Download, group: "system" },
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  "overview",
  "platform",
  "billing",
  "system",
];

export function getAdminTitleKey(pathname: string): string {
  const item = ADMIN_NAV_ITEMS.find((nav) => {
    if (nav.exact) return pathname === nav.href || pathname.endsWith(nav.href);
    return pathname.startsWith(nav.href);
  });
  return item?.key ?? "overview";
}