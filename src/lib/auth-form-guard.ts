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

  let parsed: CaptchaPayload;
  try {
    parsed = JSON.parse(
      Buffer.from(payload.captchaToken, "base64url").toString("utf8")
    ) as CaptchaPayload;
  } catch {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  const { a, b, issuedAt, sig } = parsed;
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    !Number.isInteger(issuedAt) ||
    a < 1 ||
    a > 12 ||
    b < 1 ||
    b > 12 ||
    typeof sig !== "string"
  ) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  if (Date.now() - issuedAt > CHALLENGE_TTL_MS) {
    return { ok: false, error: "CAPTCHA_EXPIRED" };
  }

  const expected = signChallenge(a, b, issuedAt);
  if (!safeEqual(expected, sig)) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  if (!Number.isInteger(payload.captchaAnswer) || a + b !== payload.captchaAnswer) {
    return { ok: false, error: "CAPTCHA_INVALID" };
  }

  return { ok: true };
}