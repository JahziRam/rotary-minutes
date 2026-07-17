/** Aliases non ISO → code ISO 4217 (clubs souvent à Madagascar). */
const CURRENCY_ALIASES: Record<string, string> = {
  AR: "MGA",
  ARIARY: "MGA",
  MGAF: "MGA",
  RM: "MYR",
  EURO: "EUR",
  EUROS: "EUR",
  DOLLAR: "USD",
  DOLLARS: "USD",
  CFA: "XOF",
  FCFA: "XOF",
};

/**
 * Normalise une devise libre (paramètres club) en code ISO 4217 valide pour Intl.
 * Évite les RangeError qui font planter le dashboard (ex. "Ar", "Ariary").
 */
export function normalizeCurrencyCode(
  currency: string | null | undefined,
  fallback = "EUR"
): string {
  const raw = (currency ?? "").trim().toUpperCase();
  if (!raw) return fallback;

  const mapped = CURRENCY_ALIASES[raw] ?? raw;
  const candidate = /^[A-Z]{3}$/.test(mapped) ? mapped : fallback;

  try {
    // Valide le code sans formater un montant réel
    new Intl.NumberFormat("en", { style: "currency", currency: candidate }).format(0);
    return candidate;
  } catch {
    if (candidate !== fallback) {
      try {
        new Intl.NumberFormat("en", { style: "currency", currency: fallback }).format(0);
        return fallback;
      } catch {
        return "EUR";
      }
    }
    return "EUR";
  }
}

export function formatMoneyAmount(
  amount: number,
  currency: string | null | undefined,
  locale: string,
  options?: { maximumFractionDigits?: number }
): string {
  const code = normalizeCurrencyCode(currency);
  const numberLocale =
    locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";
  try {
    return new Intl.NumberFormat(numberLocale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(options?.maximumFractionDigits ?? 2)} ${code}`;
  }
}
