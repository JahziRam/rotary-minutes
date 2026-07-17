import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppMobileShell } from "./app-mobile-shell";
import type { HeaderNotification } from "./header";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { ViewAsClubBanner } from "./view-as-club-banner";
import type { ViewAsClubOption } from "./club-view-as-switcher";
import { OfflineIndicator } from "./offline-indicator";
import { NotificationSound } from "@/components/notifications/notification-sound";
import { PushOnboardingBanner } from "@/components/notifications/push-onboarding-banner";
import { WebOnly } from "@/components/native/web-only";
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
  isViewingAsClub = false,
  viewAsClubs = [],
  viewAsClubId = null,
  hiddenNavKeys = [],
  lockedNavKeys = [],
  userRole,
  canManageSubscription = false,
  subscriptionPlan,
  trialEndsAt = null,
  shellLocale = "fr",
  pwaEnhanced = true,
  showDistrictNav = false,
  usageGuide = null,
  assistance = null,
  vapidPublicKey = null,
  webPushPreferenceEnabled = false,
  pushOnboardingPending = false,
}: {
  children: React.ReactNode;
  title: string;
  clubName?: string;
  notificationCount?: number;
  notifications?: HeaderNotification[];
  isSuperAdmin?: boolean;
  isViewingAsClub?: boolean;
  viewAsClubs?: ViewAsClubOption[];
  viewAsClubId?: string | null;
  hiddenNavKeys?: string[];
  lockedNavKeys?: string[];
  userRole?: string;
  canManageSubscription?: boolean;
  subscriptionPlan?: string;
  trialEndsAt?: Date | string | null;
  shellLocale?: string;
  pwaEnhanced?: boolean;
  showDistrictNav?: boolean;
  usageGuide?: UsageGuideShellProps | null;
  assistance?: AssistanceState | null;
  vapidPublicKey?: string | null;
  webPushPreferenceEnabled?: boolean;
  pushOnboardingPending?: boolean;
}) {
  const shell = (
    <div className="min-h-screen bg-gray-50">
      <NotificationSound notificationCount={notificationCount} />
      {vapidPublicKey && pushOnboardingPending && (
        <PushOnboardingBanner vapidPublicKey={vapidPublicKey} />
      )}
      <Sidebar
        clubName={clubName}
        isSuperAdmin={isSuperAdmin}
        isViewingAsClub={isViewingAsClub}
        viewAsClubs={viewAsClubs}
        viewAsClubId={viewAsClubId}
        shellLocale={shellLocale}
        hiddenNavKeys={hiddenNavKeys}
        lockedNavKeys={lockedNavKeys}
        userRole={userRole}
        notificationCount={notificationCount}
        canManageSubscription={canManageSubscription}
        subscriptionPlan={subscriptionPlan}
        showDistrictNav={showDistrictNav}
        showUsageGuide={usageGuide?.guideEnabled && usageGuide.clubSetupComplete}
      />
      <div className="lg:pl-[var(--sidebar-w)]">
        <AppMobileShell
          title={title}
          clubName={clubName}
          notificationCount={notificationCount}
          notifications={notifications}
          isSuperAdmin={isSuperAdmin}
          isViewingAsClub={isViewingAsClub}
          viewAsClubs={viewAsClubs}
          viewAsClubId={viewAsClubId}
          shellLocale={shellLocale}
          hiddenNavKeys={hiddenNavKeys}
          lockedNavKeys={lockedNavKeys}
          canManageSubscription={canManageSubscription}
          subscriptionPlan={subscriptionPlan}
          showUsageGuide={usageGuide?.guideEnabled && usageGuide.clubSetupComplete}
          showDistrictNav={showDistrictNav}
        >
          {isViewingAsClub && clubName && (
            <ViewAsClubBanner clubName={clubName} locale={shellLocale} />
          )}
          {trialEndsAt && (
            <TrialBanner trialEndsAt={trialEndsAt} locale={shellLocale} />
          )}
          <main className="p-4 lg:p-6 mobile-main max-w-7xl mx-auto">
            {children}
          </main>
        </AppMobileShell>
      </div>
      <MobileNav hiddenNavKeys={hiddenNavKeys} notificationCount={notificationCount} />
      <OfflineIndicator />
      {pwaEnhanced && (
        <WebOnly>
          <PwaInstallPrompt />
        </WebOnly>
      )}
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