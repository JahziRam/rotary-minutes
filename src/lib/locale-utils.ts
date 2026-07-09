import { locales, type Locale } from "@/i18n/config";

export function isValidUiLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveUiLocale(value?: string | null): Locale {
  if (value && isValidUiLocale(value)) return value;
  return "fr";
}

/** Maps club DB language (FR/EN) to UI locale path segment. */
export function clubLanguageToLocale(language?: string | null): Locale {
  if (language === "EN") return "en";
  return "fr";
}

export function dateFnsLocaleFor(locale: string) {
  if (locale === "fr") return import("date-fns/locale/fr").then((m) => m.fr);
  if (locale === "es") return import("date-fns/locale/es").then((m) => m.es);
  return import("date-fns/locale/en-US").then((m) => m.enUS);
}