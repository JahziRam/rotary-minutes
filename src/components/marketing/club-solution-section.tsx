import { getTranslations } from "next-intl/server";
import { Users, Calendar, Mail, FileCheck, Clock } from "lucide-react";

export async function ClubSolutionSection() {
  const t = await getTranslations("landing.solution");

  const pillars = [
    { icon: Users, title: t("members.title"), desc: t("members.desc") },
    { icon: Calendar, title: t("meetings.title"), desc: t("meetings.desc") },
    { icon: FileCheck, title: t("minutes.title"), desc: t("minutes.desc") },
    { icon: Mail, title: t("comms.title"), desc: t("comms.desc") },
  ];

  return (
    <section className="bg-white py-12 sm:py-20 border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 text-gold-dark px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-4">
            <Clock className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
            {t("title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-5 sm:p-6"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-navy/10">
                <Icon className="h-5 w-5 text-navy" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-600 max-w-2xl mx-auto">
          {t("outcome")}
        </p>
      </div>
    </section>
  );
}