import Stripe from "stripe";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface PlatformIntegrations {
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  resendApiKey?: string;
  emailFrom?: string;
}

export interface IntegrationAdminView {
  stripeEnabled: boolean;
  resendEnabled: boolean;
  stripeSecretKeySet: boolean;
  stripePublishableKeySet: boolean;
  stripeWebhookSecretSet: boolean;
  resendApiKeySet: boolean;
  emailFrom: string;
  stripePublishableKeyPreview: string;
  webhookUrl: string;
  stripeConfigured: boolean;
  resendConfigured: boolean;
}

type AppConfig = {
  integrations?: PlatformIntegrations;
};

function readStoredIntegrations(config: unknown): PlatformIntegrations {
  const stored = (config as AppConfig | null)?.integrations ?? {};
  return stored;
}

export async function getStoredIntegrations(): Promise<PlatformIntegrations> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return readStoredIntegrations(settings?.config);
}

export async function resolveIntegrations(): Promise<Required<PlatformIntegrations>> {
  const stored = await getStoredIntegrations();
  return {
    stripeSecretKey:
      stored.stripeSecretKey?.trim() || process.env.STRIPE_SECRET_KEY?.trim() || "",
    stripePublishableKey:
      stored.stripePublishableKey?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
      "",
    stripeWebhookSecret:
      stored.stripeWebhookSecret?.trim() ||
      process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
      "",
    resendApiKey:
      stored.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim() || "",
    emailFrom:
      stored.emailFrom?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      "Rotary Minutes <noreply@rotaryminutes.app>",
  };
}

export function isStripeConfigured(creds: PlatformIntegrations): boolean {
  return !!(
    creds.stripeSecretKey?.trim() &&
    creds.stripeWebhookSecret?.trim() &&
    creds.stripePublishableKey?.trim()
  );
}

export function isResendConfigured(creds: PlatformIntegrations): boolean {
  return !!(creds.resendApiKey?.trim() && creds.emailFrom?.trim());
}

let stripeCache: { key: string; client: Stripe } | null = null;

export async function getStripe(): Promise<Stripe | null> {
  const creds = await resolveIntegrations();
  const key = creds.stripeSecretKey;
  if (!key) return null;

  if (stripeCache?.key === key) return stripeCache.client;

  const client = new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  stripeCache = { key, client };
  return client;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const creds = await resolveIntegrations();
  return creds.stripeWebhookSecret || null;
}

let resendCache: { key: string; client: Resend } | null = null;

export async function getResend(): Promise<Resend | null> {
  const creds = await resolveIntegrations();
  const key = creds.resendApiKey;
  if (!key) return null;

  if (resendCache?.key === key) return resendCache.client;

  const client = new Resend(key);
  resendCache = { key, client };
  return client;
}

export async function getEmailFrom(): Promise<string> {
  const creds = await resolveIntegrations();
  return creds.emailFrom;
}

export function maskSecret(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}

export async function getIntegrationAdminView(): Promise<IntegrationAdminView> {
  const [settings, stored, resolved] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "global" } }),
    getStoredIntegrations(),
    resolveIntegrations(),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    stripeEnabled: settings?.stripeEnabled ?? false,
    resendEnabled: settings?.resendEnabled ?? false,
    stripeSecretKeySet: !!(stored.stripeSecretKey || process.env.STRIPE_SECRET_KEY),
    stripePublishableKeySet: !!(
      stored.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
    stripeWebhookSecretSet: !!(
      stored.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET
    ),
    resendApiKeySet: !!(stored.resendApiKey || process.env.RESEND_API_KEY),
    emailFrom: resolved.emailFrom,
    stripePublishableKeyPreview: maskSecret(resolved.stripePublishableKey),
    webhookUrl: `${baseUrl}/api/webhooks/stripe`,
    stripeConfigured: isStripeConfigured(resolved),
    resendConfigured: isResendConfigured(resolved),
  };
}

export function clearIntegrationCaches(): void {
  stripeCache = null;
  resendCache = null;
}

export async function mergeAndSaveIntegrations(
  input: {
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    stripeWebhookSecret?: string;
    resendApiKey?: string;
    emailFrom?: string;
    stripeEnabled?: boolean;
    resendEnabled?: boolean;
  }
): Promise<PlatformIntegrations> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const current = readStoredIntegrations(settings?.config);
  const config = (settings?.config as AppConfig | null) ?? {};

  const next: PlatformIntegrations = {
    stripeSecretKey:
      input.stripeSecretKey?.trim() || current.stripeSecretKey,
    stripePublishableKey:
      input.stripePublishableKey?.trim() || current.stripePublishableKey,
    stripeWebhookSecret:
      input.stripeWebhookSecret?.trim() || current.stripeWebhookSecret,
    resendApiKey: input.resendApiKey?.trim() || current.resendApiKey,
    emailFrom: input.emailFrom?.trim() || current.emailFrom,
  };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      config: { ...config, integrations: next } as unknown as Prisma.InputJsonValue,
      ...(input.stripeEnabled !== undefined
        ? { stripeEnabled: input.stripeEnabled }
        : {}),
      ...(input.resendEnabled !== undefined
        ? { resendEnabled: input.resendEnabled }
        : {}),
    },
    create: {
      id: "global",
      config: { integrations: next } as unknown as Prisma.InputJsonValue,
      stripeEnabled: input.stripeEnabled ?? false,
      resendEnabled: input.resendEnabled ?? false,
    },
  });

  clearIntegrationCaches();
  return next;
}