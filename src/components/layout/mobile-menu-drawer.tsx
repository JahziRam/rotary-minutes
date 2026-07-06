"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  locked?: boolean;
  badge?: number;
};

export function MobileMenuDrawer({
  open,
  onClose,
  items,
  title,
  subtitle,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fermer le menu"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 left-0 w-[min(100%,280px)] bg-navy-dark text-white shadow-2xl flex flex-col">
        <div className="h-1 bg-gold shrink-0" />
        <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
          <div className="min-w-0">
            <p className="font-display font-bold text-lg truncate">{title}</p>
            {subtitle && (
              <p className="text-xs text-white/55 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 shrink-0"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(({ key, href, icon: Icon, label, locked, badge }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);
            return (
              <Link
                key={key}
                href={fullHref}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-gold"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{label ?? key}</span>
                {locked && (
                  <span className="text-[10px] text-amber-400 uppercase">Pro</span>
                )}
                {badge != null && badge > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {footer && (
          <div className="p-3 border-t border-white/10 safe-bottom">{footer}</div>
        )}
      </aside>
    </div>
  );
}