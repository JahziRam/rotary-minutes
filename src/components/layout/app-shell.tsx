import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppMobileShell } from "./app-mobile-shell";
import type { HeaderNotification } from "./header";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { OfflineIndicator } from "./offline-indicator";
import { NotificationSound } from "@/components/notifications/notification-sound";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { UsageGuideProvider } from "@/components/assistant/usage-guide-context";
import { UsageAssistant } from "@/components/assistant/usage-assistant";
import { AssistanceProvider } from "@/components/assistance/assistance-context";
import { AssistanceOverlays } from "@/components/assistance/assistance-overlays";
import type { AssistanceState } from "@/actions/assistance";

export type UsageGuideShellProps = {
  shouldAutoStart: boolean;
  guideEnabled: boolean;
  clubSetupComplete: boolean;
  completed: boolean;
  dismissed: boolean;
  hiddenNavKeys: string[];
};

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
  pwaEnhanced = true,
  usageGuide = null,
  assistance = null,
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
  pwaEnhanced?: boolean;
  usageGuide?: UsageGuideShellProps | null;
  assistance?: AssistanceState | null;
}) {
  const shell = (
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
        showUsageGuide={usageGuide?.guideEnabled && usageGuide.clubSetupComplete}
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
          showUsageGuide={usageGuide?.guideEnabled && usageGuide.clubSetupComplete}
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
      {pwaEnhanced && <PwaInstallPrompt />}
      {usageGuide && <UsageAssistant />}
    </div>
  );

  const wrapped = assistance ? (
    <AssistanceProvider state={assistance}>
      {shell}
      <AssistanceOverlays />
    </AssistanceProvider>
  ) : (
    shell
  );

  if (!usageGuide) return wrapped;

  return <UsageGuideProvider config={usageGuide}>{wrapped}</UsageGuideProvider>;
}