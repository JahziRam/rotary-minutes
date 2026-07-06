import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { listGovernanceRecords } from "@/actions/governance";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { GovernanceTimeline } from "@/components/governance/governance-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";

export default async function GovernancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("governance");
  const ctx = await getClubContext();
  if (!ctx) redirect(`/${locale}/login`);

  if (!isFeatureEnabled(ctx.features, "governanceEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const canView =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "governance.view", false));
  if (!canView) redirect(`/${locale}/dashboard`);

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "governance.manage", false));

  const data = await listGovernanceRecords();
  const records = "records" in data && data.records ? data.records : [];

  return (
    <AppShellServer title={t("title")}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-navy" />
            {t("timelineTitle")}
          </CardTitle>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <GovernanceTimeline records={records} canManage={canManage} />
        </CardContent>
      </Card>
    </AppShellServer>
  );
}