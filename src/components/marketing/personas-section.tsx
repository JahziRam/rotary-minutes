import { getTranslations } from "next-intl/server";
import { PenLine, Crown, Map } from "lucide-react";

const personaIcons = {
  secretary: PenLine,
  president: Crown,
  governor: Map,
} as const;

const personaKeys = ["secretary", "president", "governor"] as const;

export async function PersonasSection() {
  const t = await getTranslations("landing.personas");

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
            {t("title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {personaKeys.map((key) => {
            const Icon = personaIcons[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-gray-50 p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-11 w-11 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-navy" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {t(`${key}.description`)}
                </p>
                <ul className="space-y-2">
                  {(t.raw(`${key}.benefits`) as string[]).map((benefit) => (
                    <li
                      key={benefit}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-gold mt-0.5">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}