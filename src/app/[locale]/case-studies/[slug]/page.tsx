import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getCaseStudyBySlug } from "@/lib/queries/case-studies";

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("caseStudies");
  const study = await getCaseStudyBySlug(slug);

  if (!study) notFound();

  const isFr = locale === "fr";
  const title = isFr ? study.titleFr : study.titleEn;
  const content = isFr ? study.contentFr : study.contentEn;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href={`/${locale}/case-studies`}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backList")}
          </Link>
          <p className="text-gold text-sm font-medium">{study.clubName}</p>
          <h1 className="font-display text-3xl font-bold mt-1">{title}</h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <article className="prose prose-gray max-w-none bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          {content.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </article>

        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/register`}
            className="inline-flex items-center justify-center h-11 rounded-xl px-6 text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
          >
            {t("cta")}
          </Link>
        </div>
      </main>
    </div>
  );
}