const MIN_FORM_MS = 3_000;
const MAX_FORM_MS = 3_600_000;
const MAX_SUBMISSIONS_PER_HOUR_IP = 5;
const MAX_SUBMISSIONS_PER_HOUR_EMAIL = 3;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "yopmail.com",
  "10minutemail.com",
  "throwaway.email",
  "getnada.com",
]);

export type ContactFormPayload = {
  name: string;
  email: string;
  clubName?: string;
  topic: string;
  message: string;
  website?: string;
  openedAt: number;
  captchaA: number;
  captchaB: number;
  captchaAnswer: number;
  locale: string;
};

export type ValidatedContact = {
  name: string;
  email: string;
  clubName?: string;
  topic: string;
  message: string;
  locale: string;
};

export type ContactGuardError = { ok: false; error: string };
export type ContactGuardSuccess = { ok: true; data: ValidatedContact };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

function looksLikeSpam(text: string): boolean {
  const urls = (text.match(/https?:\/\/|www\./gi) ?? []).length;
  if (urls > 4) return true;
  if (/(.)\1{8,}/.test(text)) return true;
  if (text.replace(/\s/g, "").length > 0 && text === text.toUpperCase() && text.length > 40) {
    return true;
  }
  return false;
}

export function validateContactForm(payload: ContactFormPayload): ContactGuardSuccess | ContactGuardError {
  if (payload.website?.trim()) {
    return { ok: false, error: "SPAM_DETECTED" };
  }

  const elapsed = Date.now() - payload.openedAt;
  if (!Number.isFinite(payload.openedAt) || elapsed < MIN_FORM_MS || elapsed > MAX_FORM_MS) {
    return { ok: false, error: "TIMING_INVALID" };
  }

  // Captcha retiré (2026-07) : cause suspectée de saturation mémoire serveur.
  // Honeypot ("website") + vérification de timing ci-dessus restent actifs.

  const name = payload.name?.trim() ?? "";
  const email = normalizeEmail(payload.email ?? "");
  const clubName = payload.clubName?.trim() ?? "";
  const topic = payload.topic?.trim() ?? "";
  const message = payload.message?.trim() ?? "";

  if (name.length < 2 || name.length > 120) return { ok: false, error: "NAME_INVALID" };
  if (!/[\p{L}]/u.test(name)) return { ok: false, error: "NAME_INVALID" };
  if (!isValidEmail(email)) return { ok: false, error: "EMAIL_INVALID" };
  if (isDisposableEmail(email)) return { ok: false, error: "EMAIL_DISPOSABLE" };
  if (clubName.length > 160) return { ok: false, error: "CLUB_INVALID" };

  const allowedTopics = ["demo", "pricing", "support", "partnership", "other"];
  if (!allowedTopics.includes(topic)) return { ok: false, error: "TOPIC_INVALID" };

  if (message.length < 20 || message.length > 4000) return { ok: false, error: "MESSAGE_INVALID" };
  if (looksLikeSpam(message) || looksLikeSpam(name)) return { ok: false, error: "SPAM_DETECTED" };

  return {
    ok: true,
    data: {
      name,
      email,
      clubName: clubName || undefined,
      topic,
      message,
      locale: payload.locale === "en" ? "en" : "fr",
    },
  };
}

export async function assertContactRateLimit(
  email: string,
  ipAddress: string | null
): Promise<ContactGuardError | { ok: true }> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const { prisma } = await import("@/lib/prisma");

  if (ipAddress) {
    const ipCount = await prisma.auditLog.count({
      where: { action: "CONTACT_FORM", createdAt: { gte: since }, ipAddress },
    });
    if (ipCount >= MAX_SUBMISSIONS_PER_HOUR_IP) {
      return { ok: false, error: "RATE_LIMIT" };
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: { action: "CONTACT_FORM", createdAt: { gte: since } },
    select: { metadata: true },
    take: 300,
  });

  const normalized = email.trim().toLowerCase();
  const sameEmail = logs.filter((l) => {
    const meta = l.metadata as { email?: string } | null;
    return meta?.email?.toLowerCase() === normalized;
  }).length;

  if (sameEmail >= MAX_SUBMISSIONS_PER_HOUR_EMAIL) {
    return { ok: false, error: "RATE_LIMIT" };
  }

  return { ok: true };
}