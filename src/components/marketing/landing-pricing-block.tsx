"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PricingSectionClient } from "./pricing-section-client";
import { trackPricingView } from "@/lib/landing-analytics";
import { planGridClass, type BillingSettings, type PublicPlan } from "@/lib/plans-utils";
import type { AddonKey } from "@/generated/prisma/client";

type PublicAddon = {
  key: AddonKey;
  name: string;
  description: string | null;
  priceMonthly: number;
};

export function LandingPricingBlock({ locale }: { locale: string }) {
  const t = useTranslations("landing.pricing");
  const tAddons = useTranslations("landing.addons");
  const sectionRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<{
    plans: PublicPlan[];
    billing: BillingSettings;
    addons: PublicAddon[];
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/public/marketing?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [locale]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          trackPricingView();
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        id="pricing"
        className="py-16 lg:py-24 bg-gray-50 border-t"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
              {t("title")}
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{t("subtitle")}</p>
          </div>

          {error && (
            <p className="text-center text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 mb-6">
              {t("loadError")}
            </p>
          )}

          {data ? (
            <PricingSectionClient plans={data.plans} billing={data.billing} locale={locale} />
          ) : (
            <div className={`${planGridClass(3)} animate-pulse`}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-xl bg-gray-200/70" />
              ))}
            </div>
          )}

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

      {data && data.addons.length > 0 && (
        <section className="py-12 lg:py-16 bg-white border-t">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-gray-900">{tAddons("title")}</h2>
              <p className="text-gray-500 mt-2 max-w-2xl mx-auto">{tAddons("subtitle")}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.addons.map((addon) => (
                <div
                  key={addon.key}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 flex flex-col gap-2"
                >
                  <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                  {addon.description && (
                    <p className="text-sm text-gray-500 flex-1">{addon.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}