"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Bell, Megaphone, CheckCheck, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  markNotificationsRead,
  markNotificationRead,
  markAnnouncementNotificationsRead,
} from "@/actions/notifications";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  targetType: string;
  sentAt: string | null;
  authorName: string;
}

const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  MEETING_REMINDER: { fr: "Réunion", en: "Meeting" },
  ACTION_REMINDER: { fr: "Action", en: "Action" },
  DEADLINE_REMINDER: { fr: "Échéance", en: "Deadline" },
  NEW_MEETING: { fr: "Nouvelle réunion", en: "New meeting" },
  NEW_MINUTE: { fr: "Nouveau PV", en: "New minute" },
  SYSTEM: { fr: "Système", en: "System" },
  ANNOUNCEMENT: { fr: "Annonce", en: "Announcement" },
  DUES_REMINDER: { fr: "Cotisation", en: "Dues" },
};

export function NotificationsView({
  tab,
  locale,
  notifications,
  announcements,
  unreadCount,
}: {
  tab: "notifications" | "announcements";
  locale: string;
  notifications: NotificationItem[];
  announcements: AnnouncementItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const dateLocale = locale === "fr" ? fr : enUS;
  const t = (fr: string, en: string) => (locale === "fr" ? fr : en);

  function run(action: () => Promise<unknown>, refresh = true) {
    startTransition(async () => {
      await action();
      if (refresh) router.refresh();
    });
  }

  const tabs = [
    {
      key: "notifications" as const,
      label: t("Notifications", "Notifications"),
      icon: Bell,
      href: `/${locale}/notifications`,
      count: notifications.filter((n) => !n.isRead).length,
    },
    {
      key: "announcements" as const,
      label: t("Annonces", "Announcements"),
      icon: Megaphone,
      href: `/${locale}/notifications?tab=announcements`,
      count: announcements.length,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500">
          {unreadCount > 0
            ? t(`${unreadCount} non lue(s)`, `${unreadCount} unread`)
            : t("Tout est à jour", "All caught up")}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => markNotificationsRead(locale))}
          >
            <CheckCheck className="h-4 w-4" />
            {t("Tout marquer comme lu", "Mark all as read")}
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon, href, count }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-navy text-navy"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count > 0 && (
              <Badge variant={tab === key ? "default" : "muted"} className="text-[10px]">
                {count}
              </Badge>
            )}
          </Link>
        ))}
      </div>

      {tab === "notifications" && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500 text-sm">
                {t("Aucune notification", "No notifications")}
              </CardContent>
            </Card>
          ) : (
            notifications.map((n) => {
              const typeLabel =
                TYPE_LABELS[n.type]?.[locale === "fr" ? "fr" : "en"] ?? n.type;
              const href = n.link
                ? n.link.startsWith("/")
                  ? n.link.match(/^\/(fr|en)/)
                    ? n.link
                    : `/${locale}${n.link}`
                  : n.link
                : null;

              return (
                <Card
                  key={n.id}
                  className={cn(!n.isRead && "border-l-4 border-l-gold")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="muted">{typeLabel}</Badge>
                          {!n.isRead && (
                            <Badge variant="warning">{t("Non lue", "Unread")}</Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {format(new Date(n.createdAt), "d MMM yyyy HH:mm", {
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 mt-2">{n.title}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {n.message}
                        </p>
                        {href && (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 text-sm text-navy hover:underline mt-2"
                            onClick={() => {
                              if (!n.isRead) {
                                void markNotificationRead(n.id, locale);
                              }
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t("Voir le détail", "View details")}
                          </Link>
                        )}
                      </div>
                      {!n.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(() => markNotificationRead(n.id, locale))
                          }
                        >
                          {t("Lu", "Read")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-3">
          {announcements.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => markAnnouncementNotificationsRead(locale))}
              >
                <CheckCheck className="h-4 w-4" />
                {t("Marquer les annonces comme lues", "Mark announcements as read")}
              </Button>
            </div>
          )}
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500 text-sm">
                {t("Aucune annonce pour votre club", "No announcements for your club")}
              </CardContent>
            </Card>
          ) : (
            announcements.map((a) => (
              <Card key={a.id} className="border-l-4 border-l-navy">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="gold">{t("Annonce plateforme", "Platform announcement")}</Badge>
                    <span className="text-xs text-gray-400">
                      {a.sentAt &&
                        format(new Date(a.sentAt), "d MMM yyyy HH:mm", {
                          locale: dateLocale,
                        })}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 mt-2 text-lg">{a.title}</p>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">
                    {a.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-3">
                    {t("Publié par", "Published by")} {a.authorName}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}