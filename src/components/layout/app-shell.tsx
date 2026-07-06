import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppMobileShell } from "./app-mobile-shell";
import type { HeaderNotification } from "./header";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { OfflineIndicator } from "./offline-indicator";
import { NotificationSound } from "@/components/notifications/notification-sound";

export function AppShell({
  children,
  title,
  clubName,
  notificationCount,
  notifications,
  isSuperAdmin,
  hiddenNavKeys = [],
  lockedNavKeys = [],
  userRole,
  canManageSubscription = false,
  subscriptionPlan,
  trialEndsAt = null,
  shellLocale = "fr",
}: {
  children: React.ReactNode;
  title: string;
  clubName?: string;
  notificationCount?: number;
  notifications?: HeaderNotification[];
  isSuperAdmin?: boolean;
  hiddenNavKeys?: string[];
  lockedNavKeys?: string[];
  userRole?: string;
  canManageSubscription?: boolean;
  subscriptionPlan?: string;
  trialEndsAt?: Date | string | null;
  shellLocale?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSound notificationCount={notificationCount} />
      <Sidebar
        clubName={clubName}
        isSuperAdmin={isSuperAdmin}
        hiddenNavKeys={hiddenNavKeys}
        lockedNavKeys={lockedNavKeys}
        userRole={userRole}
        notificationCount={notificationCount}
        canManageSubscription={canManageSubscription}
        subscriptionPlan={subscriptionPlan}
      />
      <div className="lg:pl-[var(--sidebar-w)]">
        <AppMobileShell
          title={title}
          clubName={clubName}
          notificationCount={notificationCount}
          notifications={notifications}
          isSuperAdmin={isSuperAdmin}
          hiddenNavKeys={hiddenNavKeys}
          lockedNavKeys={lockedNavKeys}
          canManageSubscription={canManageSubscription}
          subscriptionPlan={subscriptionPlan}
        >
          {trialEndsAt && (
            <TrialBanner trialEndsAt={trialEndsAt} locale={shellLocale} />
          )}
          <main className="p-4 lg:p-6 pb-[calc(var(--bottom-nav-h)+1rem)] lg:pb-6 max-w-7xl mx-auto">
            {children}
          </main>
        </AppMobileShell>
      </div>
      <MobileNav />
      <OfflineIndicator />
    </div>
  );
}