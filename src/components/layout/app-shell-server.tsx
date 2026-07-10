import { headers } from "next/headers";
import { getSession } from "@/lib/cached-auth";
import { AppShell } from "./app-shell";
import { clubLanguageToLocale, resolveUiLocale } from "@/lib/locale-utils";
import { DEMO_CLUB } from "@/lib/demo-data";
import { getUserNotifications } from "@/lib/queries/notifications";
import { getClubContext } from "@/lib/club-context";
import { getHiddenNavKeys, getLockedNavKeys, shouldShowDistrictNav } from "@/lib/nav-access";
import { getViewAsClubId } from "@/lib/view-as-club";
import { prisma } from "@/lib/prisma";
import { getUsageGuideContext } from "@/actions/usage-guide";
import { getAssistanceState } from "@/actions/assistance";
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
  const viewAsClubId = isSuperAdmin ? await getViewAsClubId() : null;
  const ctx = !isSuperAdmin || viewAsClubId ? await getClubContext() : null;
  const isViewingAsClub = isSuperAdmin && !!viewAsClubId && !!ctx;
  const clubName = ctx?.clubName
    ?? (!isSuperAdmin
      ? session?.user?.memberships?.[0]?.clubName ?? DEMO_CLUB.name
      : undefined);

  const viewAsClubs = isSuperAdmin
    ? await prisma.club.findMany({
        where: { isActive: true },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
      })
    : [];

  const notifData = session?.user?.id
    ? await getUserNotifications(session.user.id)
    : { items: [], unreadCount: 0 };

  const role = (ctx?.role ?? session?.user?.memberships?.[0]?.role ?? "READER") as ClubRoleType;
  const features = ctx?.features ?? DEFAULT_FEATURES;
  const hiddenNavKeys = getHiddenNavKeys(role, features, isSuperAdmin);
  const lockedNavKeys = getLockedNavKeys(role, features, isSuperAdmin);
  const hasDistrictAccess =
    isSuperAdmin ||
    (session?.user?.id
      ? (await prisma.districtAccess.count({ where: { userId: session.user.id } })) > 0
      : false);
  const showDistrictNav = shouldShowDistrictNav(hasDistrictAccess, features, isSuperAdmin);
  const canManageSubscription =
    !isSuperAdmin &&
    (await hasRolePermission(role, "settings.manage", false));
  const headersList = await headers();
  const routeLocale = resolveUiLocale(headersList.get("x-locale"));
  const clubLocale = clubLanguageToLocale(ctx?.club.language);
  const planLocale = routeLocale || clubLocale;
  const subscriptionPlan = ctx?.club.subscription?.plan
    ? getPlanLabel(ctx.club.subscription.plan, planLocale)
    : getPlanLabel("TRIAL", planLocale);

  const subscription = ctx?.club.subscription;
  const showTrialBanner =
    !isSuperAdmin &&
    subscription?.status === "TRIALING" &&
    subscription.trialEndsAt != null &&
    new Date(subscription.trialEndsAt) > new Date();

  const shellLocale = routeLocale;
  const usageGuide = !isSuperAdmin ? await getUsageGuideContext() : null;
  const assistance = !isSuperAdmin ? await getAssistanceState() : null;

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
      isViewingAsClub={isViewingAsClub}
      viewAsClubs={viewAsClubs}
      viewAsClubId={viewAsClubId}
      hiddenNavKeys={hiddenNavKeys}
      lockedNavKeys={lockedNavKeys}
      userRole={role}
      canManageSubscription={canManageSubscription}
      subscriptionPlan={subscriptionPlan}
      trialEndsAt={showTrialBanner ? subscription!.trialEndsAt! : null}
      shellLocale={shellLocale}
      pwaEnhanced={features.pwaEnhancedEnabled || isSuperAdmin}
      showDistrictNav={showDistrictNav}
      usageGuide={
        usageGuide
          ? {
              shouldAutoStart: usageGuide.shouldShow,
              guideEnabled: usageGuide.guideEnabled,
              clubSetupComplete: usageGuide.clubSetupComplete,
              completed: usageGuide.completed,
              dismissed: usageGuide.dismissed,
              hiddenNavKeys: usageGuide.hiddenNavKeys,
            }
          : null
      }
      assistance={assistance}
    >
      {children}
    </AppShell>
  );
}