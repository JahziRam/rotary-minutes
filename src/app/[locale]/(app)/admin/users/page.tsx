import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { adminQuery } from "@/lib/admin-safe";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DistrictAccessPanel } from "@/components/admin/district-access-panel";
import { UsersTable } from "@/components/admin/users-table";
import { listDistrictAccessGrants, listDistinctDistricts } from "@/lib/queries/district";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const [users, clubs, districtGrants, districts] = await Promise.all([
    adminQuery("users", () =>
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          memberships: { include: { club: { select: { id: true, name: true } } } },
        },
      }),
      []
    ),
    adminQuery(
      "clubs",
      () => prisma.club.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      []
    ),
    listDistrictAccessGrants(),
    adminQuery("districts", () => listDistinctDistricts(), []),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isSuperAdmin: u.isSuperAdmin,
    clubs: u.memberships.map((m) => ({
      clubId: m.clubId,
      clubName: m.club?.name ?? "—",
      role: m.role,
    })),
  }));

  const grantRows = districtGrants.map((grant) => ({
    id: grant.id,
    district: grant.district,
    role: grant.role,
    canViewPV: grant.canViewPV,
    expiresAt: grant.expiresAt?.toISOString() ?? null,
    grantedAt: grant.grantedAt.toISOString(),
    user: grant.user,
    grantedBy: grant.grantedBy,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("users")} description={tPages("users")} />
      <Card>
        <CardContent className="pt-6">
          <UsersTable users={rows} clubs={clubs} />
        </CardContent>
      </Card>
      <DistrictAccessPanel grants={grantRows} districts={districts} />
    </div>
  );
}