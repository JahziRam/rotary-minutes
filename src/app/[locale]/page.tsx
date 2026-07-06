import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  FileText,
  Shield,
  Share2,
  PenLine,
  CheckCircle,
} from "lucide-react";
import { LandingHero } from "@/components/marketing/landing-hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LandingCta } from "@/components/marketing/landing-cta";
import { PersonasSection } from "@/components/marketing/personas-section";
import { PricingSection } from "@/components/marketing/pricing-section";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const otherLocale = locale === "fr" ? "en" : "fr";

  const features = [
    {
      icon: PenLine,
      title: t("landing.features.write"),
      desc: t("landing.features.writeDesc"),
      accent: "from-gold/20 to-gold/5",
    },
    {
      icon: FileText,
      title: t("landing.features.pdf"),
      desc: t("landing.features.pdfDesc"),
      accent: "from-navy/15 to-navy/5",
    },
    {
      icon: Share2,
      title: t("landing.features.share"),
      desc: t("landing.features.shareDesc"),
      accent: "from-emerald-500/15 to-emerald-500/5",
    },
    {
      icon: Shield,
      title: t("landing.features.secure"),
      desc: t("landing.features.secureDesc"),
      accent: "from-blue-500/15 to-blue-500/5",
    },
  ];

  const highlights = [
    t("landing.highlights.secure"),
    t("landing.highlights.bilingual"),
    t("landing.highlights.offline"),
    t("landing.highlights.pdf"),
    t("landing.highlights.district"),
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-dark/95 text-white backdrop-blur-md">
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3.5">
          <Link href={`/${locale}`} className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Rotary <span className="text-gold">Minutes</span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href={`/${locale}#pricing`}
              className="hidden text-sm text-white/70 transition-colors hover:text-white md:inline"
            >
              {t("landing.pricing.title")}
            </Link>
            <Link
              href={`/${otherLocale}`}
              className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70 transition-colors hover:border-white/30 hover:text-white sm:px-2.5 sm:text-xs"
            >
              {otherLocale}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="hidden text-sm text-white/80 transition-colors hover:text-white xs:inline sm:inline"
            >
              {t("auth.login")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gold px-3 text-[11px] font-semibold text-navy-dark shadow-sm transition-all hover:bg-gold-light sm:h-10 sm:px-5 sm:text-sm"
            >
              {t("landing.cta")}
            </Link>
          </nav>
        </div>
      </header>

      <LandingHero locale={locale} />

      <section className="border-b border-gray-100 bg-white py-4 sm:py-6">
        <div className="mx-auto max-w-6xl overflow-x-auto px-3 sm:px-4">
          <div className="flex min-w-max gap-4 px-1 sm:min-w-0 sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3">
            {highlights.map((item) => (
              <span
                key={item}
                className="inline-flex shrink-0 items-center gap-2 text-xs text-gray-600 sm:text-sm"
              >
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-gold sm:h-4 sm:w-4" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {t("landing.features.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 sm:mt-3 sm:text-base">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-300 active:scale-[0.99] sm:p-6 sm:hover:-translate-y-1 sm:hover:border-gold/30 sm:hover:shadow-lg"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br sm:mb-4 sm:h-11 sm:w-11 ${accent}`}
                >
                  <Icon className="h-5 w-5 text-navy" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-gray-900 sm:mb-2 sm:text-base">{title}</h3>
                <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      <PersonasSection />

      <PricingSection locale={locale} />

      <LandingCta locale={locale} />

      <footer className="mt-auto border-t border-white/10 bg-navy-dark py-6 text-center text-sm text-white/50 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4 sm:gap-6">
          <Link href={`/${locale}/demo`} className="transition-colors hover:text-white">
            {t("landing.tryDemo")}
          </Link>
          <Link href={`/${locale}/login`} className="transition-colors hover:text-white">
            {t("auth.login")}
          </Link>
        </div>
        <p className="mt-3 sm:mt-4">© {new Date().getFullYear()} Rotary Minutes</p>
      </footer>
    </div>
  );
}