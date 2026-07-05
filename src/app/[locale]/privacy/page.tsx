import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  const sections = [
    { title: t("sections.controller.title"), body: t("sections.controller.body") },
    { title: t("sections.data.title"), body: t("sections.data.body") },
    { title: t("sections.purpose.title"), body: t("sections.purpose.body") },
    { title: t("sections.retention.title"), body: t("sections.retention.body") },
    { title: t("sections.rights.title"), body: t("sections.rights.body") },
    { title: t("sections.security.title"), body: t("sections.security.body") },
    { title: t("sections.contact.title"), body: t("sections.contact.body") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}`} className="font-display text-xl font-bold hover:opacity-90">
            Rotary Minutes
          </Link>
          <Link href={`/${locale}/login`} className="text-sm text-white/80 hover:text-white">
            {locale === "fr" ? "Connexion" : "Login"}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-navy/10 flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7 text-navy" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">{t("title")}</h1>
          <p className="text-gray-500">{t("updated")}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-8">
            <p className="text-gray-600 leading-relaxed">{t("intro")}</p>
            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{section.body}</p>
              </section>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-400">
          <Link href={`/${locale}/status`} className="text-navy hover:underline">
            {t("statusLink")}
          </Link>
        </p>
      </main>
    </div>
  );
}