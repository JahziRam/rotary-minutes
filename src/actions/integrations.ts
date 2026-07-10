"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { clubHasApiAccess, hashApiKey } from "@/lib/api-auth";
import {
  dispatchClubWebhook,
  generateWebhookSecret,
} from "@/lib/club-webhooks";
import type { ApiKeyScope, WebhookEvent } from "@/generated/prisma/client";

function revalidateIntegrationPaths(locale: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings/integrations`);
    revalidatePath(`/${loc}/settings`);
  }
  revalidatePath(`/${locale}/settings/integrations`);
}

async function requireApiAccess() {
  const auth = await requirePermission("settings.manage");
  if ("error" in auth) return auth;

  const allowed = await clubHasApiAccess(auth.ctx.clubId);
  if (!allowed) return { error: "API_ACCESS_DISABLED" as const };

  return auth;
}

// ─── API keys ────────────────────────────────────────────────────────────────

export async function listApiKeys() {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const keys = await prisma.clubApiKey.findMany({
    where: { clubId: auth.ctx.clubId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  return { success: true as const, keys };
}

export async function createApiKey(
  data: {
    name: string;
    scopes: ApiKeyScope[];
    expiresAt?: string | null;
  },
  locale: string
) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  if (!data.name.trim()) return { error: "INVALID_NAME" as const };
  if (!data.scopes.length) return { error: "SCOPES_REQUIRED" as const };

  const rawKey = `rm_live_${randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);

  const key = await prisma.clubApiKey.create({
    data: {
      clubId: auth.ctx.clubId,
      name: data.name.trim(),
      keyPrefix,
      keyHash,
      scopes: data.scopes,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById: auth.ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: auth.ctx.clubId,
      userId: auth.ctx.userId,
      action: "API_KEY_CREATED",
      entity: "ClubApiKey",
      entityId: key.id,
      metadata: { name: key.name, scopes: key.scopes },
    },
  });

  revalidateIntegrationPaths(locale);
  return { success: true as const, rawKey, keyId: key.id, keyPrefix };
}

export async function revokeApiKey(keyId: string, locale: string) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const key = await prisma.clubApiKey.findFirst({
    where: { id: keyId, clubId: auth.ctx.clubId },
  });
  if (!key) return { error: "NOT_FOUND" as const };

  await prisma.clubApiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  revalidateIntegrationPaths(locale);
  return { success: true as const };
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export async function listWebhooks() {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const webhooks = await prisma.clubWebhook.findMany({
    where: { clubId: auth.ctx.clubId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  return {
    success: true as const,
    webhooks: webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      createdAt: w.createdAt,
      deliveryCount: w._count.deliveries,
    })),
  };
}

export async function createWebhook(
  data: {
    url: string;
    events: WebhookEvent[];
  },
  locale: string
) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  let parsed: URL;
  try {
    parsed = new URL(data.url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { error: "INVALID_URL" as const };
    }
  } catch {
    return { error: "INVALID_URL" as const };
  }

  if (!data.events.length) return { error: "EVENTS_REQUIRED" as const };

  const secret = generateWebhookSecret();
  const webhook = await prisma.clubWebhook.create({
    data: {
      clubId: auth.ctx.clubId,
      url: parsed.toString(),
      secret,
      events: data.events,
    },
  });

  revalidateIntegrationPaths(locale);
  return { success: true as const, webhookId: webhook.id, secret };
}

export async function updateWebhook(
  webhookId: string,
  data: {
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  },
  locale: string
) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const existing = await prisma.clubWebhook.findFirst({
    where: { id: webhookId, clubId: auth.ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  let url = existing.url;
  if (data.url) {
    try {
      const parsed = new URL(data.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { error: "INVALID_URL" as const };
      }
      url = parsed.toString();
    } catch {
      return { error: "INVALID_URL" as const };
    }
  }

  await prisma.clubWebhook.update({
    where: { id: webhookId },
    data: {
      url,
      events: data.events,
      isActive: data.isActive,
    },
  });

  revalidateIntegrationPaths(locale);
  return { success: true as const };
}

export async function deleteWebhook(webhookId: string, locale: string) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const existing = await prisma.clubWebhook.findFirst({
    where: { id: webhookId, clubId: auth.ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubWebhook.delete({ where: { id: webhookId } });
  revalidateIntegrationPaths(locale);
  return { success: true as const };
}

export async function testWebhook(webhookId: string, locale: string) {
  const auth = await requireApiAccess();
  if ("error" in auth) return auth;

  const webhook = await prisma.clubWebhook.findFirst({
    where: { id: webhookId, clubId: auth.ctx.clubId, isActive: true },
  });
  if (!webhook) return { error: "NOT_FOUND" as const };

  const event = webhook.events[0] ?? "MEETING_CREATED";
  const { getAppName } = await import("@/lib/app-settings");
  const appName = await getAppName();
  await dispatchClubWebhook(auth.ctx.clubId, event, {
    test: true,
    message: `${appName} webhook test`,
    webhookId,
  });

  revalidateIntegrationPaths(locale);
  return { success: true as const };
}