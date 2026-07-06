import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { adminQuery } from "@/lib/admin-safe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DistrictAccessPanel } from "@/components/admin/district-access-panel";
import { UsersTable } from "@/components/admin/users-table";
import { listDistrictAccessGrants, listDistinctDistricts } from "@/lib/queries/district";
import { Users } from "lucide-react";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-navy" />
            Utilisateurs plateforme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={rows} clubs={clubs} />
        </CardContent>
      </Card>

      <DistrictAccessPanel grants={grantRows} districts={districts} />
    </div>
  );
}