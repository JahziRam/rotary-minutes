import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { getRoleLabel } from "@/lib/role-labels";
import { CLUB_ROLES } from "@/lib/rotary";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubUsersTable } from "@/components/settings/club-users-table";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default async function ClubUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext();

  if (!ctx) {
    return (
      <AppShellServer title={t("settings.users")}>
        <p className="text-gray-500">Non connecté</p>
      </AppShellServer>
    );
  }

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "users.manage", false));

  if (!canManage) {
    return (
      <AppShellServer title={t("settings.users")}>
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
            <p className="text-gray-600">Vous n&apos;avez pas la permission de gérer les utilisateurs.</p>
            <Link
              href={`/${locale}/settings`}
              className="text-sm text-navy hover:underline"
            >
              Retour aux paramètres
            </Link>
          </CardContent>
        </Card>
      </AppShellServer>
    );
  }

  const memberships = await prisma.clubMembership.findMany({
    where: { clubId: ctx.clubId, isActive: true },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  const users = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    role: m.role,
    isActive: m.isActive,
  }));

  return (
    <AppShellServer title={t("settings.users")}>
      <div className="max-w-3xl space-y-4">
        <Link
          href={`/${locale}/settings`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("settings.title")}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.users")}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {t("settings.usersManageHintClub", { clubName: ctx.clubName })}
            </p>
          </CardHeader>
          <CardContent>
            <ClubUsersTable
              users={users}
              currentUserId={ctx.userId}
              roleOptions={CLUB_ROLES.map((r) => ({
                value: r,
                label: getRoleLabel(r, locale),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </AppShellServer>
  );
}