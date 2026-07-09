"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { clubDuesWebhookUrl } from "@/lib/club-stripe";

function revalidateDuesPaymentSettings() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/settings`);
    revalidatePath(`/${loc}/my-account`);
  }
}

async function requireDuesPaymentSettingsManage() {
  const feature = await requireFeature("duesEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  return auth;
}

export async function getClubDuesPaymentSettings() {
  const auth = await requireDuesPaymentSettingsManage();
  if (auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const settings = await prisma.clubDuesPaymentSettings.findUnique({
    where: { clubId: ctx.clubId },
  });

  return {
    settings: {
      stripeEnabled: settings?.stripeEnabled ?? false,
      hasSecretKey: Boolean(settings?.stripeSecretKey),
      hasWebhookSecret: Boolean(settings?.stripeWebhookSecret),
      paymentInstructions: settings?.paymentInstructions ?? "",
      webhookUrl: clubDuesWebhookUrl(ctx.clubId),
    },
  };
}

export async function updateClubDuesPaymentSettings(data: {
  stripeEnabled: boolean;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  paymentInstructions?: string;
}) {
  const auth = await requireDuesPaymentSettingsManage();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubDuesPaymentSettings.findUnique({
    where: { clubId: ctx.clubId },
  });

  const secretKey = data.stripeSecretKey?.trim()
    ? data.stripeSecretKey.trim()
    : existing?.stripeSecretKey ?? null;
  const webhookSecret = data.stripeWebhookSecret?.trim()
    ? data.stripeWebhookSecret.trim()
    : existing?.stripeWebhookSecret ?? null;

  if (data.stripeEnabled && !secretKey) {
    return { error: "STRIPE_KEY_REQUIRED" as const };
  }

  await prisma.clubDuesPaymentSettings.upsert({
    where: { clubId: ctx.clubId },
    create: {
      clubId: ctx.clubId,
      stripeEnabled: data.stripeEnabled,
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret,
      paymentInstructions: data.paymentInstructions?.trim() || null,
    },
    update: {
      stripeEnabled: data.stripeEnabled,
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret,
      paymentInstructions: data.paymentInstructions?.trim() || null,
    },
  });

  revalidateDuesPaymentSettings();
  return { success: true as const };
}