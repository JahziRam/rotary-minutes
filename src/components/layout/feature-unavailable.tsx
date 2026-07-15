import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Lock, ArrowUpCircle, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { resolvePlanLabel } from "@/lib/plans";
import type { GatedFeature } from "@/lib/feature-gate";

export async function FeatureUnavailable({
  feature,
  locale,
  plan,
}: {
  feature: GatedFeature;
  locale: string;
  plan?: string;
}) {
  const t = await getTranslations("features");
  const featureLabel = t(`labels.${feature}`);
  const planLabel = await resolvePlanLabel(plan, locale);

  return (
    <Card className="max-w-xl mx-auto border-amber-200 bg-amber-50/40">
      <CardContent className="p-8 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="h-7 w-7 text-amber-700" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{t("unavailableTitle")}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t("unavailableMessage", { feature: featureLabel, plan: planLabel })}
          </p>
          <p className="text-sm text-gray-500">{t("upgradeHint")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/${locale}/settings/subscription`}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t("upgradeCta")}
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            {t("backDashboard")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}