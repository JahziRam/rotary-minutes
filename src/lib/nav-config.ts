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
  CalendarDays,
} from "lucide-react";

export type ClubNavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  /** Affiché dans la barre de navigation mobile basse */
  mobileTab?: boolean;
};

/** Navigation club — source unique pour sidebar, drawer et bottom nav */
export const CLUB_NAV_ITEMS: ClubNavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: Home, mobileTab: true },
  { key: "meetings", href: "/meetings", icon: Calendar, mobileTab: true },
  { key: "minutes", href: "/minutes", icon: FileText, mobileTab: true },
  { key: "notifications", href: "/notifications", icon: Bell, mobileTab: true },
  { key: "members", href: "/members", icon: Users, mobileTab: true },
  { key: "emails", href: "/emails", icon: Mail },
  { key: "treasury", href: "/treasury", icon: Wallet },
  { key: "actions", href: "/actions", icon: CheckSquare },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "myAccount", href: "/my-account", icon: UserCircle },
  { key: "attendanceReports", href: "/attendance-reports", icon: ClipboardList },
  { key: "events", href: "/events", icon: PartyPopper },
  { key: "documents", href: "/documents", icon: FolderOpen },
  { key: "statistics", href: "/statistics", icon: BarChart3 },
  { key: "district", href: "/district", icon: Map },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "support", href: "/support", icon: LifeBuoy },
];

export function getMobileTabItems(): ClubNavItem[] {
  return CLUB_NAV_ITEMS.filter((item) => item.mobileTab);
}