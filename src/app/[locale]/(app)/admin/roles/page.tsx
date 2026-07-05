import { setRequestLocale } from "next-intl/server";
import { getAllRoleConfigs } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RolesEditor } from "@/components/admin/roles-editor";
import { Shield } from "lucide-react";

export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const roles = await getAllRoleConfigs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-navy" />
          Rôles et permissions
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Définissez les permissions de chaque rôle club. Le Super Admin a toujours un accès illimité.
        </p>
      </CardHeader>
      <CardContent>
        <RolesEditor
          roles={roles.map((r) => ({
            role: r.role,
            labelFr: r.labelFr,
            labelEn: r.labelEn,
            description: r.description,
            permissions: r.permissions as string[],
            isActive: r.isActive,
          }))}
        />
      </CardContent>
    </Card>
  );
}