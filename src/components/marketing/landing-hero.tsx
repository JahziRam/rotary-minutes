import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { ProductPreview } from "./product-preview";

export async function LandingHero({ locale }: { locale: string }) {
  const t = await getTranslations("landing");

  const stats = [
    { value: t("stats.time"), label: t("stats.timeLabel") },
    { value: t("stats.trial"), label: t("stats.trialLabel") },
    { value: t("stats.lang"), label: t("stats.langLabel") },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-dark to-[#041018] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(245,166,35,.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(26,74,122,.5), transparent 45%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-light">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            {t("hero")}
            <span className="mt-2 block text-gold">{t("heroHighlight")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/75 lg:mx-0">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href={`/${locale}/register`}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-6 text-base font-semibold text-navy-dark shadow-lg shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-gold/40"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <Play className="h-4 w-4" />
              {t("tryDemo")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/45">{t("trialLine")}</p>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <dt className="font-display text-2xl font-bold text-gold">{value}</dt>
                <dd className="mt-1 text-xs leading-snug text-white/55">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="animate-[float_6s_ease-in-out_infinite]">
          <ProductPreview locale={locale} />
        </div>
      </div>
    </section>
  );
}