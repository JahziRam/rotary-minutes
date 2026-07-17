import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { listActions } from "@/actions/club-actions";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { ActionsPanel } from "@/components/actions/actions-panel";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("actions");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "actionsEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const data = await listActions();
  if ("error" in data) return null;

  return (
    <AppShellServer title={t("title")}>
      <ActionsPanel
        actions={data.actions}
        members={data.members}
        commissions={data.commissions}
        canManage={data.canManage}
        locale={locale}
      />
    </AppShellServer>
  );
}