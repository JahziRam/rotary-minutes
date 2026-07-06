import { getTranslations } from "next-intl/server";
import { FileEdit, Send, ShieldCheck } from "lucide-react";

const stepIcons = [FileEdit, ShieldCheck, Send] as const;

export async function HowItWorks() {
  const t = await getTranslations("landing.howItWorks");
  const steps = ["step1", "step2", "step3"] as const;

  return (
    <section className="border-y border-gray-100 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900">{t("title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">{t("subtitle")}</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((key, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={key} className="relative text-center md:text-left">
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-[calc(50%+28px)] top-6 hidden h-px w-[calc(100%-56px)] bg-gradient-to-r from-gold/60 to-gold/20 md:block"
                    aria-hidden
                  />
                )}
                <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold shadow-lg shadow-navy/20 md:mx-0">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-gold-dark">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{t(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{t(`${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}