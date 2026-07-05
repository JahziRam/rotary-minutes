import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { clubHasApiAccess } from "@/lib/api-auth";
import { listApiKeys, listWebhooks } from "@/actions/integrations";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("integrations");
  const tSettings = await getTranslations("settings");

  const ctx = await getClubContext();
  if (!ctx) redirect(`/${locale}/login`);

  const canManage =
    ctx.isSuperAdmin ||
    (await hasRolePermission(ctx.role, "settings.manage", false));

  if (!canManage) redirect(`/${locale}/settings`);

  const hasAccess = await clubHasApiAccess(ctx.clubId);
  if (!hasAccess) {
    return (
      <AppShellServer title={t("title")}>
        <div className="max-w-2xl space-y-4">
          <Link href={`/${locale}/settings`} className="text-sm text-navy hover:underline">
            ← {tSettings("title")}
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-3">
            <p className="text-gray-700">{t("upgradeRequired")}</p>
            <Link
              href={`/${locale}/settings/subscription`}
              className="inline-flex h-10 items-center px-4 rounded-lg bg-navy text-white text-sm font-medium"
            >
              {t("upgradeCta")}
            </Link>
          </div>
        </div>
      </AppShellServer>
    );
  }

  const [keysResult, hooksResult] = await Promise.all([
    listApiKeys(),
    listWebhooks(),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <AppShellServer title={t("title")}>
      <div className="max-w-3xl space-y-4">
        <Link href={`/${locale}/settings`} className="text-sm text-navy hover:underline">
          ← {tSettings("title")}
        </Link>
        <IntegrationsPanel
          apiKeys={"keys" in keysResult ? keysResult.keys : []}
          webhooks={"webhooks" in hooksResult ? hooksResult.webhooks : []}
          baseUrl={baseUrl}
        />
      </div>
    </AppShellServer>
  );
}