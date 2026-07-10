import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllRoleConfigs, getAllCustomRoles } from "@/lib/roles";
import { adminQuery } from "@/lib/admin-safe";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { RolesEditor } from "@/components/admin/roles-editor";

export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const [roles, customRoles] = await Promise.all([
    adminQuery("roleConfigs", () => getAllRoleConfigs(), []),
    adminQuery("customRoles", () => getAllCustomRoles(), []),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("roles")} description={tPages("roles")} />
      <Card>
        <CardContent className="pt-6 space-y-4">
        {roles.length === 0 ? (
          <AdminErrorBanner message="Aucun rôle chargé. Vérifiez que la base est à jour (prisma db push)." />
        ) : null}
        <RolesEditor
          builtinRoles={roles.map((r) => ({
            role: r.role,
            labelFr: r.labelFr,
            labelEn: r.labelEn,
            description: r.description,
            permissions: r.permissions as string[],
            isActive: r.isActive,
          }))}
          customRoles={customRoles.map((r) => ({
            id: r.id,
            key: r.key,
            labelFr: r.labelFr,
            labelEn: r.labelEn,
            description: r.description,
            permissions: r.permissions as string[],
            isActive: r.isActive,
            membershipCount: r._count.memberships,
          }))}
        />
        </CardContent>
      </Card>
    </div>
  );
}