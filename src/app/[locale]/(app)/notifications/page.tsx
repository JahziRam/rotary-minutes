import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getClubContext } from "@/lib/club-context";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { ClubAnnouncementsPanel } from "@/components/notifications/club-announcements-panel";
import { WebPushEnable } from "@/components/notifications/web-push-enable";
import { getVapidPublicKey } from "@/lib/vapid-config";
import { isWebPushEnabledForUser } from "@/lib/push-preference";
import { hasRolePermission } from "@/lib/roles";
import {
  getAllUserNotifications,
  getUserAnnouncements,
  getUserNotifications,
} from "@/lib/queries/notifications";
import type { ClubRole } from "@/generated/prisma/client";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab: tabParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{t("unauthorized")}</p>
      </AppShellServer>
    );
  }

  const ctx = await getClubContext();
  const tab = tabParam === "announcements" ? "announcements" : "notifications";

  const canSendAnnouncements =
    !!ctx &&
    (session.user.isSuperAdmin ||
      (await hasRolePermission(ctx.role, "settings.manage", false)) ||
      ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY", "ADMIN"].includes(ctx.role));

  const [notifications, announcements, notifSummary] = await Promise.all([
    getAllUserNotifications(session.user.id, { excludeAnnouncement: true }),
    getUserAnnouncements({
      userId: session.user.id,
      clubId: ctx?.clubId,
      role: ctx?.role as ClubRole | undefined,
      isSuperAdmin: session.user.isSuperAdmin,
    }),
    getUserNotifications(session.user.id),
  ]);

  const vapidPublicKey = await getVapidPublicKey();
  const webPushEnabled = ctx
    ? await isWebPushEnabledForUser(session.user.id, ctx.clubId)
    : false;

  return (
    <AppShellServer title={t("title")}>
      <WebPushEnable
        vapidPublicKey={vapidPublicKey}
        preferenceEnabled={webPushEnabled}
      />
      {canSendAnnouncements && tab === "announcements" && (
        <div className="mb-6">
          <ClubAnnouncementsPanel locale={locale} />
        </div>
      )}

      <NotificationsView
        tab={tab}
        locale={locale}
        unreadCount={notifSummary.unreadCount}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          targetType: a.targetType,
          sentAt: a.sentAt?.toISOString() ?? null,
          authorName: `${a.author.firstName} ${a.author.lastName}`,
        }))}
      />
    </AppShellServer>
  );
}