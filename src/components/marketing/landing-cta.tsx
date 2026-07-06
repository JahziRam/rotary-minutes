import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

export async function LandingCta({ locale }: { locale: string }) {
  const t = await getTranslations("landing.finalCta");

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-navy to-navy-dark py-12 text-white sm:py-16 lg:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 100% 50%, rgba(245,166,35,.35), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-3 text-center sm:px-4">
        <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">{t("title")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">{t("subtitle")}</p>
        <Link
          href={`/${locale}/register`}
          className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-8 text-base font-semibold text-navy-dark shadow-lg transition-all hover:bg-gold-light"
        >
          {t("cta")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-4 text-sm text-white/45">{t("note")}</p>
      </div>
    </section>
  );
}