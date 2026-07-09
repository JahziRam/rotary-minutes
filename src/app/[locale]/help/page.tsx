import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, BookOpen, Calendar, CreditCard, FileText, Mail, Map, Rocket, Wallet } from "lucide-react";
import { HELP_ARTICLES } from "@/lib/help-articles";
import { buildPageMetadata } from "@/lib/seo";

const ICONS = {
  rocket: Rocket,
  "file-text": FileText,
  calendar: Calendar,
  wallet: Wallet,
  mail: Mail,
  map: Map,
  "credit-card": CreditCard,
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.help" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/help",
  });
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backHome")}
          </Link>
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-gold" />
            <div>
              <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
              <p className="text-white/70 text-sm mt-1">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-4">
        {HELP_ARTICLES.map(({ id, icon }) => {
          const Icon = ICONS[icon as keyof typeof ICONS] ?? BookOpen;
          return (
            <article
              key={id}
              id={id}
              className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm scroll-mt-6"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-navy" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{t(`articles.${id}.title`)}</h2>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed whitespace-pre-line">
                    {t(`articles.${id}.body`)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}

        <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 text-center">
          <p className="text-sm text-gray-600">{t("contactHint")}</p>
          <Link
            href={`/${locale}`}
            className="inline-flex mt-3 text-sm font-semibold text-navy underline underline-offset-2"
          >
            {t("contactCta")}
          </Link>
        </div>
      </main>
    </div>
  );
}