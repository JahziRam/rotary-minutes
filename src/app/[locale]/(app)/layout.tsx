import { getSession } from "@/lib/cached-auth";
import { getClubContext } from "@/lib/club-context";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { InactiveClubNotice } from "@/components/layout/inactive-club-notice";
import { ExpiredSubscriptionNotice } from "@/components/subscription/expired-subscription-notice";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (
    !session.user.isSuperAdmin &&
    session.user.memberships.length === 0 &&
    session.user.pendingJoin
  ) {
    redirect(`/${locale}/pending-approval`);
  }

  if (
    !session.user.isSuperAdmin &&
    session.user.memberships.length === 0 &&
    !session.user.pendingJoin
  ) {
    redirect(`/${locale}/register`);
  }

  if (!session.user.isSuperAdmin && session.user.memberships.length > 0) {
    const ctx = await getClubContext();
    const club = ctx?.club;

    if (club && !club.isActive) {
      const t = await getTranslations("auth");
      return (
        <InactiveClubNotice clubName={club.name} logoutLabel={t("logout")} />
      );
    }

    if (club?.subscription?.status === "EXPIRED") {
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") ?? "";
      const isSubscriptionPage =
        pathname === "/settings/subscription" ||
        pathname.startsWith("/settings/subscription/");

      if (!isSubscriptionPage) {
        return (
          <ExpiredSubscriptionNotice locale={locale} clubName={club.name} />
        );
      }
    }
  }

  return <>{children}</>;
}