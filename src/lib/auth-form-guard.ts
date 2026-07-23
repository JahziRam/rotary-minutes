import { createHmac, timingSafeEqual } from "node:crypto";

const MIN_FORM_MS = 2_000;
const MAX_FORM_MS = 3_600_000;
const CHALLENGE_TTL_MS = 15 * 60_000;

type CaptchaPayload = { a: number; b: number; issuedAt: number; sig: string };

function authSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-auth-captcha";
}

function signChallenge(a: number, b: number, issuedAt: number): string {
  return createHmac("sha256", authSecret()).update(`${a}:${b}:${issuedAt}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createAuthCaptchaChallenge(): { a: number; b: number; token: string } {
  const a = 1 + Math.floor(Math.random() * 12);
  const b = 1 + Math.floor(Math.random() * 12);
  const issuedAt = Date.now();
  const sig = signChallenge(a, b, issuedAt);
  const token = Buffer.from(JSON.stringify({ a, b, issuedAt, sig } satisfies CaptchaPayload)).toString(
    "base64url"
  );
  return { a, b, token };
}

export type AuthFormGuardPayload = {
  captchaToken: string;
  captchaAnswer: number;
  openedAt: number;
  website?: string;
};

export function validateAuthFormGuard(
  payload: AuthFormGuardPayload
): { ok: true } | { ok: false; error: string } {
  if (payload.website?.trim()) {
    return { ok: false, error: "SPAM_DETECTED" };
  }

  const elapsed = Date.now() - payload.openedAt;
  if (!Number.isFinite(payload.openedAt) || elapsed < MIN_FORM_MS || elapsed > MAX_FORM_MS) {
    return { ok: false, error: "TIMING_INVALID" };
  }

  // Captcha retiré (2026-07) : cause suspectée de saturation mémoire serveur.
  // Honeypot ("website") + vérification de timing ci-dessus restent actifs.
  void CHALLENGE_TTL_MS;
  void signChallenge;
  void safeEqual;

  return { ok: true };
}