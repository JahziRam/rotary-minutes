import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  FileText,
  Shield,
  Share2,
  PenLine,
  CheckCircle,
  BookOpen,
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-dark/95 text-white backdrop-blur-md">
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href={`/${locale}`} className="font-display text-xl font-bold tracking-tight">
            Rotary <span className="text-gold">Minutes</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href={`/${locale}#pricing`}
              className="hidden text-sm text-white/70 transition-colors hover:text-white sm:inline"
            >
              {t("landing.pricing.title")}
            </Link>
            <Link
              href={`/${otherLocale}`}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              {otherLocale}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              {t("auth.login")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gold px-4 text-xs font-semibold text-navy-dark shadow-sm transition-all hover:bg-gold-light hover:shadow-gold/30 sm:h-10 sm:px-5 sm:text-sm"
            >
              {t("landing.cta")}
            </Link>
          </nav>
        </div>
      </header>

      <LandingHero locale={locale} />

      <section className="border-b border-gray-100 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
          {highlights.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 text-sm text-gray-600"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-gold" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-gray-900">
              {t("landing.features.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="group rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-navy/5"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}
                >
                  <Icon className="h-5 w-5 text-navy" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      <PersonasSection />

      <PricingSection locale={locale} />

      <section className="border-t border-gray-100 bg-white py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900">
            {t("landing.caseStudies.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            {t("landing.caseStudies.subtitle")}
          </p>
          <Link
            href={`/${locale}/case-studies`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-navy/5 px-5 py-2.5 font-medium text-navy transition-all hover:border-navy/25 hover:bg-navy/10"
          >
            <BookOpen className="h-4 w-4" />
            {t("landing.caseStudiesLink")}
          </Link>
        </div>
      </section>

      <LandingCta locale={locale} />

      <footer className="mt-auto border-t border-white/10 bg-navy-dark py-8 text-center text-sm text-white/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-4">
          <Link href={`/${locale}/demo`} className="transition-colors hover:text-white">
            {t("landing.tryDemo")}
          </Link>
          <Link href={`/${locale}/case-studies`} className="transition-colors hover:text-white">
            {t("landing.caseStudiesLink")}
          </Link>
          <Link href={`/${locale}/login`} className="transition-colors hover:text-white">
            {t("auth.login")}
          </Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Rotary Minutes</p>
      </footer>
    </div>
  );
}