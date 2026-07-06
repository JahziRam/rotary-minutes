import { setRequestLocale } from "next-intl/server";
import { FeatureFlagsPanel } from "@/components/admin/feature-flags-panel";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { listFeatureFlags } from "@/actions/feature-flags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";

export default async function AdminFeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await listFeatureFlags();
  const hasError = "error" in result;
  const flags = "flags" in result && result.flags ? result.flags : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-navy" />
          Feature flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasError ? (
          <AdminErrorBanner message="Accès refusé ou erreur de chargement des feature flags." />
        ) : null}
        <FeatureFlagsPanel flags={flags} />
      </CardContent>
    </Card>
  );
}