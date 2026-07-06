import { getTranslations } from "next-intl/server";
import { PenLine, Crown, Map, CheckCircle2 } from "lucide-react";

const personaIcons = {
  secretary: PenLine,
  president: Crown,
  governor: Map,
} as const;

const personaKeys = ["secretary", "president", "governor"] as const;

export async function PersonasSection() {
  const t = await getTranslations("landing.personas");

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900">{t("title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">{t("subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {personaKeys.map((key, i) => {
            const Icon = personaIcons[key];
            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-xl hover:shadow-navy/5"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold to-gold-light opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-gold-dark">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {t(`${key}.title`)}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  {t(`${key}.description`)}
                </p>
                <ul className="space-y-2.5">
                  {(t.raw(`${key}.benefits`) as string[]).map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
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