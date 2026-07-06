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
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-3 py-10 sm:gap-12 sm:px-4 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-light sm:mb-5 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="font-display text-[1.75rem] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            {t("hero")}
            <span className="mt-1.5 block text-gold sm:mt-2">{t("heroHighlight")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:mt-5 sm:text-lg lg:mx-0">
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 lg:justify-start">
            <Link
              href={`/${locale}/register`}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 text-base font-semibold text-navy-dark shadow-lg shadow-gold/25 transition-all hover:bg-gold-light sm:w-auto"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
            >
              <Play className="h-4 w-4" />
              {t("tryDemo")}
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/45 sm:mt-4 sm:text-sm">{t("trialLine")}</p>
          <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 sm:mt-10 sm:gap-4 sm:pt-8">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <dt className="font-display text-lg font-bold text-gold sm:text-2xl">{value}</dt>
                <dd className="mt-0.5 text-[10px] leading-snug text-white/55 sm:mt-1 sm:text-xs">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="order-1 mx-auto w-full max-w-sm animate-[float_6s_ease-in-out_infinite] sm:max-w-md lg:order-2 lg:max-w-none">
          <ProductPreview locale={locale} />
        </div>
      </div>
    </section>
  );
}