import { describe, expect, it } from "vitest";
import { formatMoneyAmount, normalizeCurrencyCode } from "./currency";

describe("normalizeCurrencyCode", () => {
  it("keeps valid ISO codes", () => {
    expect(normalizeCurrencyCode("EUR")).toBe("EUR");
    expect(normalizeCurrencyCode("mga")).toBe("MGA");
    expect(normalizeCurrencyCode("USD")).toBe("USD");
  });

  it("maps Madagascar aliases that crash Intl", () => {
    expect(normalizeCurrencyCode("Ar")).toBe("MGA");
    expect(normalizeCurrencyCode("Ariary")).toBe("MGA");
    expect(normalizeCurrencyCode("ariary")).toBe("MGA");
  });

  it("falls back for empty or unknown values", () => {
    expect(normalizeCurrencyCode("")).toBe("EUR");
    expect(normalizeCurrencyCode(null)).toBe("EUR");
    expect(normalizeCurrencyCode("INVALID")).toBe("EUR");
    expect(normalizeCurrencyCode("$$")).toBe("EUR");
  });
});

describe("formatMoneyAmount", () => {
  it("formats without throwing on invalid club currencies", () => {
    expect(() => formatMoneyAmount(1000, "Ar", "fr")).not.toThrow();
    expect(() => formatMoneyAmount(1000, "Ariary", "fr")).not.toThrow();
    expect(formatMoneyAmount(1000, "Ar", "fr")).toMatch(/1[\s\u00a0]?000|1000/);
  });
});
