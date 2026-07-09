import { getRequestConfig } from "next-intl/server";
import { locales, type Locale } from "./config";

function deepMergeMessages(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeMessages(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>
      );
    } else {
      result[key] = overrideVal;
    }
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) {
    locale = "fr";
  }

  if (locale === "es") {
    const [en, es] = await Promise.all([
      import("../../messages/en.json"),
      import("../../messages/es.json"),
    ]);
    return {
      locale,
      messages: deepMergeMessages(
        en.default as Record<string, unknown>,
        es.default as Record<string, unknown>
      ),
    };
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});