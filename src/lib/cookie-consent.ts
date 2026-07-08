export const CONSENT_COOKIE = "rm_cookie_consent";
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  decidedAt: string;
}

export function createConsent(analytics: boolean): CookieConsent {
  return {
    essential: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
}

export function parseConsentCookie(raw: string | undefined | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CookieConsent;
    if (parsed.essential !== true || typeof parsed.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readConsentCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return parseConsentCookie(match?.[1] ?? null);
}

export function writeConsentCookie(consent: CookieConsent): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(consent));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function hasAnalyticsConsent(): boolean {
  return readConsentCookie()?.analytics === true;
}

export function hasConsentDecision(): boolean {
  return readConsentCookie() !== null;
}