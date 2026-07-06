import { getTranslations } from "next-intl/server";
import {
  Wallet,
  CheckSquare,
  CalendarRange,
  UserCircle,
  Sparkles,
} from "lucide-react";

const ICONS = [Wallet, CheckSquare, CalendarRange, UserCircle, Sparkles];

export async function ModulesTeaserSection() {
  const t = await getTranslations("landing.modules");

  const items = [
    { title: t("finance.title"), desc: t("finance.desc") },
    { title: t("execution.title"), desc: t("execution.desc") },
    { title: t("calendar.title"), desc: t("calendar.desc") },
    { title: t("portal.title"), desc: t("portal.desc") },
    { title: t("advanced.title"), desc: t("advanced.desc") },
  ];

  return (
    <section className="border-y border-gray-100 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">{t("badge")}</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map(({ title, desc }, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={title}
                className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-4 sm:p-5"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10">
                  <Icon className="h-4 w-4 text-navy" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 sm:text-sm">{desc}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">{t("note")}</p>
      </div>
    </section>
  );
}