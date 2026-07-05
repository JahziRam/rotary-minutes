import { getSession } from "@/lib/cached-auth";
import { AppShell } from "./app-shell";
import { DEMO_CLUB } from "@/lib/demo-data";
import { getUserNotifications } from "@/lib/queries/notifications";
import { getClubContext } from "@/lib/club-context";
import { getHiddenNavKeys, getLockedNavKeys } from "@/lib/nav-access";
import { DEFAULT_FEATURES } from "@/lib/features";
import { getPlanLabel } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRoleType } from "@/lib/rotary";

export async function AppShellServer({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const session = await getSession();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const clubName =
    session?.user?.memberships?.[0]?.clubName ?? DEMO_CLUB.name;

  const notifData = session?.user?.id
    ? await getUserNotifications(session.user.id)
    : { items: [], unreadCount: 0 };

  const ctx = isSuperAdmin ? null : await getClubContext();
  const role = (ctx?.role ?? session?.user?.memberships?.[0]?.role ?? "READER") as ClubRoleType;
  const features = ctx?.features ?? DEFAULT_FEATURES;
  const hiddenNavKeys = getHiddenNavKeys(role, features, isSuperAdmin);
  const lockedNavKeys = getLockedNavKeys(role, features, isSuperAdmin);
  const canManageSubscription =
    !isSuperAdmin &&
    (await hasRolePermission(role, "settings.manage", false));
  const planLocale = ctx?.club.language === "EN" ? "en" : "fr";
  const subscriptionPlan = ctx?.club.subscription?.plan
    ? getPlanLabel(ctx.club.subscription.plan, planLocale)
    : getPlanLabel("TRIAL", planLocale);

  const subscription = ctx?.club.subscription;
  const showTrialBanner =
    !isSuperAdmin &&
    subscription?.status === "TRIALING" &&
    subscription.trialEndsAt != null &&
    new Date(subscription.trialEndsAt) > new Date();

  const shellLocale = planLocale;

  return (
    <AppShell
      title={title}
      clubName={clubName}
      notificationCount={notifData.unreadCount}
      notifications={notifData.items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        link: n.link,
      }))}
      isSuperAdmin={isSuperAdmin}
      hiddenNavKeys={hiddenNavKeys}
      lockedNavKeys={lockedNavKeys}
      userRole={role}
      canManageSubscription={canManageSubscription}
      subscriptionPlan={subscriptionPlan}
      trialEndsAt={showTrialBanner ? subscription!.trialEndsAt! : null}
      shellLocale={shellLocale}
    >
      {children}
    </AppShell>
  );
}