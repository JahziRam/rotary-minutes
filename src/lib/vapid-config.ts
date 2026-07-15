import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface VapidSettings {
  publicKey?: string;
  privateKey?: string;
  subject?: string;
}

export interface VapidAdminView {
  configured: boolean;
  publicKeySet: boolean;
  privateKeySet: boolean;
  subject: string;
  publicKeyPreview: string;
  envFallback: boolean;
}

type AppConfig = {
  vapid?: VapidSettings;
};

function readStoredVapid(config: unknown): VapidSettings {
  return (config as AppConfig | null)?.vapid ?? {};
}

export async function getStoredVapid(): Promise<VapidSettings> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return readStoredVapid(settings?.config);
}

export async function resolveVapid(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
}> {
  const stored = await getStoredVapid();
  const { getAppBaseUrl } = await import("@/lib/app-url");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? getAppBaseUrl();
  return {
    publicKey:
      stored.publicKey?.trim() ||
      process.env.VAPID_PUBLIC_KEY?.trim() ||
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
      "",
    privateKey: stored.privateKey?.trim() || process.env.VAPID_PRIVATE_KEY?.trim() || "",
    subject:
      stored.subject?.trim() ||
      process.env.VAPID_SUBJECT?.trim() ||
      (baseUrl.startsWith("http") ? baseUrl : "mailto:support@rotaryminutes.app"),
  };
}

export async function isVapidConfigured(): Promise<boolean> {
  const creds = await resolveVapid();
  return !!(creds.publicKey && creds.privateKey && creds.subject);
}

export async function getVapidPublicKey(): Promise<string | null> {
  const creds = await resolveVapid();
  return creds.publicKey || null;
}

export function maskVapidKey(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 12) return "••••••••";
  return `${value.slice(0, 8)}••••${value.slice(-6)}`;
}

export async function getVapidAdminView(): Promise<VapidAdminView> {
  const [stored, resolved] = await Promise.all([getStoredVapid(), resolveVapid()]);
  const envFallback = !stored.publicKey && !!process.env.VAPID_PUBLIC_KEY;
  return {
    configured: !!(resolved.publicKey && resolved.privateKey),
    publicKeySet: !!(stored.publicKey || process.env.VAPID_PUBLIC_KEY),
    privateKeySet: !!(stored.privateKey || process.env.VAPID_PRIVATE_KEY),
    subject: resolved.subject,
    publicKeyPreview: maskVapidKey(resolved.publicKey),
    envFallback,
  };
}

export async function mergeAndSaveVapid(input: {
  publicKey?: string;
  privateKey?: string;
  subject?: string;
}): Promise<VapidSettings> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const current = readStoredVapid(settings?.config);
  const config = (settings?.config as AppConfig | null) ?? {};

  const next: VapidSettings = {
    publicKey: input.publicKey?.trim() || current.publicKey,
    privateKey: input.privateKey?.trim() || current.privateKey,
    subject: input.subject?.trim() || current.subject,
  };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      config: { ...config, vapid: next } as unknown as Prisma.InputJsonValue,
    },
    create: {
      id: "global",
      config: { vapid: next } as unknown as Prisma.InputJsonValue,
    },
  });

  return next;
}

export async function generateAndSaveVapidKeys(subject?: string): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const webpush = await import("web-push");
  const mod = webpush.default ?? webpush;
  const keys = mod.generateVAPIDKeys();
  await mergeAndSaveVapid({
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject,
  });
  return keys;
}