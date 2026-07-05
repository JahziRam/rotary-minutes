import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getActivePublicPlans } from "@/lib/plans";
import { PricingSectionClient } from "./pricing-section-client";

export async function PricingSection({ locale }: { locale: string }) {
  const t = await getTranslations("landing.pricing");
  const { plans, billing } = await getActivePublicPlans(locale);

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-gray-50 border-t">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
            {t("title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        <PricingSectionClient plans={plans} billing={billing} locale={locale} />

        <p className="text-center text-sm text-gray-500 mt-8">{t("trialNote")}</p>
        <div className="text-center mt-4">
          <Link
            href={`/${locale}/register`}
            className="inline-flex items-center justify-center h-11 rounded-xl px-6 text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}