import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Building2 } from "lucide-react";
import { getPublishedCaseStudies } from "@/lib/queries/case-studies";

export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("caseStudies");
  const studies = await getPublishedCaseStudies();
  const isFr = locale === "fr";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backHome")}
          </Link>
          <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
          <p className="text-white/70 text-sm mt-1">{t("subtitle")}</p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {studies.length === 0 ? (
          <p className="text-gray-500 text-center">{t("empty")}</p>
        ) : (
          <div className="space-y-4">
            {studies.map((study) => (
              <Link
                key={study.id}
                href={`/${locale}/case-studies/${study.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-navy" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg text-gray-900">
                      {isFr ? study.titleFr : study.titleEn}
                    </h2>
                    <p className="text-sm text-gold-dark font-medium mt-0.5">
                      {study.clubName}
                    </p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {isFr ? study.summaryFr : study.summaryEn}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}