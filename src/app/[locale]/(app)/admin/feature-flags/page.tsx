import { setRequestLocale } from "next-intl/server";
import { FeatureFlagsPanel } from "@/components/admin/feature-flags-panel";
import { listFeatureFlags } from "@/actions/feature-flags";

export default async function AdminFeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await listFeatureFlags();
  const flags = "flags" in result ? result.flags : [];

  return <FeatureFlagsPanel flags={flags} />;
}