"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
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
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: "/admin/clubs", icon: Building2, label: "Clubs" },
  { href: "/admin/users", icon: Users, label: "Utilisateurs" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { href: "/admin/roles", icon: Shield, label: "Rôles" },
  { href: "/admin/announcements", icon: Megaphone, label: "Annonces" },
  { href: "/admin/support", icon: LifeBuoy, label: "Support" },
  { href: "/admin/contacts", icon: Mail, label: "Contacts" },
  { href: "/admin/feature-flags", icon: Flag, label: "Feature flags" },
  { href: "/admin/settings", icon: Settings, label: "Paramètres SaaS" },
  { href: "/admin/export", icon: Download, label: "Export" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {items.map(({ href, icon: Icon, label }) => {
        const full = `/${locale}${href}`;
        const active =
          href === "/admin"
            ? pathname === full
            : pathname.startsWith(full);
        return (
          <Link
            key={href}
            href={full}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0",
              active
                ? "bg-navy text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}