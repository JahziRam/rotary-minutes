import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  FileText,
  Shield,
  Share2,
  PenLine,
  CheckCircle,
  Play,
  BookOpen,
} from "lucide-react";
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

  const features = [
    {
      icon: PenLine,
      title: t("landing.features.write"),
      desc: t("landing.features.writeDesc"),
    },
    {
      icon: FileText,
      title: t("landing.features.pdf"),
      desc: t("landing.features.pdfDesc"),
    },
    {
      icon: Share2,
      title: t("landing.features.share"),
      desc: t("landing.features.shareDesc"),
    },
    {
      icon: Shield,
      title: t("landing.features.secure"),
      desc: t("landing.features.secureDesc"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-display text-xl font-bold">Rotary Minutes</span>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              {t("auth.login")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
            >
              {t("landing.cta")}
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-navy to-navy-dark text-white py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight mb-6">
            {t("landing.hero")}
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            {t("landing.subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="inline-flex items-center justify-center h-12 rounded-xl px-6 text-base font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
            >
              {t("landing.cta")}
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-xl px-6 text-base font-medium border border-white/30 text-white hover:bg-white/10 transition-all"
            >
              <Play className="h-4 w-4" />
              {t("landing.tryDemo")}
            </Link>
          </div>
          <p className="text-sm text-white/50 mt-4">{t("auth.trialInfo")}</p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-navy" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PersonasSection />

      <PricingSection locale={locale} />

      <section className="py-16 bg-white border-t">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
            {t("app.tagline")}
          </h2>
          <ul className="space-y-3 text-left max-w-md mx-auto mb-8">
            {[
              t("landing.highlights.secure"),
              t("landing.highlights.bilingual"),
              t("landing.highlights.offline"),
              t("landing.highlights.pdf"),
              t("landing.highlights.district"),
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-gold shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={`/${locale}/case-studies`}
            className="inline-flex items-center gap-2 text-navy font-medium hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            {t("landing.caseStudiesLink")}
          </Link>
        </div>
      </section>

      <footer className="bg-navy-dark text-white/50 text-sm py-6 text-center mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href={`/${locale}/demo`} className="hover:text-white transition-colors">
            {t("landing.tryDemo")}
          </Link>
          <Link href={`/${locale}/case-studies`} className="hover:text-white transition-colors">
            {t("landing.caseStudiesLink")}
          </Link>
        </div>
        © {new Date().getFullYear()} Rotary Minutes
      </footer>
    </div>
  );
}