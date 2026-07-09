/** Trilingual helper for demo components with inline copy (not yet in messages). */
export function pickDemoLocale(
  locale: string,
  texts: { fr: string; en: string; es: string }
): string {
  if (locale === "fr") return texts.fr;
  if (locale === "es") return texts.es;
  return texts.en;
}

export function demoDateFnsLocale(locale: string) {
  if (locale === "fr") return import("date-fns/locale/fr").then((m) => m.fr);
  if (locale === "es") return import("date-fns/locale/es").then((m) => m.es);
  return import("date-fns/locale/en-US").then((m) => m.enUS);
}