"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  link?: string | null;
}

export function Header({
  title,
  notificationCount = 0,
  notifications = [],
}: {
  title: string;
  notificationCount?: number;
  notifications?: HeaderNotification[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);

  function openNotifications() {
    setShowNotifs((v) => !v);
  }

  const toggleLocale = () => {
    const newLocale = locale === "fr" ? "en" : "fr";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-[var(--header-h)]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Changer de langue"
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase font-medium">{locale}</span>
          </button>
          <button
            type="button"
            onClick={openNotifications}
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="danger"
                className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center px-1"
              >
                {notificationCount}
              </Badge>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {notificationCount > 0
                    ? `${notificationCount} notification${notificationCount > 1 ? "s" : ""}`
                    : "Notifications"}
                </p>
              </div>
              {notifications.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link.startsWith("/") ? `/${locale}${n.link.replace(/^\/(fr|en)/, "")}` : n.link}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowNotifs(false)}
                        >
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        </Link>
                      ) : (
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-gray-500 text-center">
                  Aucune notification
                </p>
              )}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <Link
                  href={`/${locale}/notifications`}
                  className="block text-center text-sm font-medium text-navy hover:underline"
                  onClick={() => setShowNotifs(false)}
                >
                  {locale === "fr" ? "Voir tout" : "View all"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}