export interface EnvCheck {
  key: string;
  ok: boolean;
  required: boolean;
  hint?: string;
}

const REQUIRED = ["DATABASE_URL", "AUTH_SECRET"] as const;

const RECOMMENDED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function checkEnv(): EnvCheck[] {
  return [
    ...REQUIRED.map((key) => ({
      key,
      ok: Boolean(process.env[key]?.trim()),
      required: true,
      hint: key === "AUTH_SECRET" ? "openssl rand -base64 32" : undefined,
    })),
    ...RECOMMENDED.map((key) => ({
      key,
      ok: Boolean(process.env[key]?.trim()),
      required: false,
    })),
  ];
}

export function assertRequiredEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
}