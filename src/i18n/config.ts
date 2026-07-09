export const locales = ["fr", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};