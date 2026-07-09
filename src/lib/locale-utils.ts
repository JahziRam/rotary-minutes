import { fr, enUS, es } from "date-fns/locale";
import type { Language } from "@/generated/prisma/client";
import { locales, type Locale } from "@/i18n/config";

export const ALL_UI_LOCALES = locales;

export function isValidUiLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveUiLocale(value?: string | null): Locale {
  if (value && isValidUiLocale(value)) return value;
  return "fr";
}

/** Maps club DB language to UI locale path segment. */
export function clubLanguageToLocale(language?: string | null): Locale {
  if (language === "EN") return "en";
  if (language === "ES") return "es";
  return "fr";
}

/** Maps UI locale to club/user Language enum for new registrations. */
export function uiLocaleToClubLanguage(locale: string): Language {
  if (locale === "en") return "EN";
  if (locale === "es") return "ES";
  return "FR";
}

export function dateFnsLocaleForUi(locale: string) {
  if (locale === "fr") return fr;
  if (locale === "es") return es;
  return enUS;
}

export function intlDateLocale(locale: string): string {
  if (locale === "fr") return "fr-FR";
  if (locale === "es") return "es-ES";
  return "en-GB";
}