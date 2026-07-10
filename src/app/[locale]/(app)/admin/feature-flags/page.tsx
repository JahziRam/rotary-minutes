import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureFlagsPanel } from "@/components/admin/feature-flags-panel";
import { ModulesFeatureFlagsPanel } from "@/components/admin/modules-feature-flags-panel";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { listFeatureFlags, getDefaultClubFeatures } from "@/actions/feature-flags";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminFeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const [result, defaultsResult] = await Promise.all([
    listFeatureFlags(),
    getDefaultClubFeatures(),
  ]);
  const hasError = "error" in result;
  const flags = "flags" in result && result.flags ? result.flags : [];
  const moduleDefaults =
    "defaults" in defaultsResult && defaultsResult.defaults
      ? defaultsResult.defaults
      : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("featureFlags")} description={tPages("featureFlags")} />
      <Card>
        <CardContent className="pt-6 space-y-4">
        {hasError ? (
          <AdminErrorBanner message="Accès refusé ou erreur de chargement des feature flags." />
        ) : null}
        {moduleDefaults ? (
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Modules club (défauts plateforme)</h3>
            <ModulesFeatureFlagsPanel defaults={moduleDefaults} />
          </div>
        ) : null}
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Feature flags (rollout)</h3>
          <FeatureFlagsPanel flags={flags} />
        </div>
        </CardContent>
      </Card>
    </div>
  );
}