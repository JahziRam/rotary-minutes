import { describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  createConsent,
  parseConsentCookie,
} from "./cookie-consent";

describe("createConsent", () => {
  it("stores analytics preference with timestamp", () => {
    const consent = createConsent(true);
    expect(consent.essential).toBe(true);
    expect(consent.analytics).toBe(true);
    expect(consent.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("parseConsentCookie", () => {
  it("parses encoded consent cookie", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ essential: true, analytics: false, decidedAt: "2026-01-01T00:00:00.000Z" })
    );
    expect(parseConsentCookie(raw)).toEqual({
      essential: true,
      analytics: false,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseConsentCookie("not-json")).toBeNull();
    expect(parseConsentCookie(null)).toBeNull();
    expect(
      parseConsentCookie(
        encodeURIComponent(JSON.stringify({ essential: false, analytics: true, decidedAt: "x" }))
      )
    ).toBeNull();
  });
});

describe("CONSENT_COOKIE", () => {
  it("uses stable cookie name", () => {
    expect(CONSENT_COOKIE).toBe("rm_cookie_consent");
  });
});