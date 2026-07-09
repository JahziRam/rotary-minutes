"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { testClubSmtpDirect } from "@/lib/club-smtp";

function revalidateEmails() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/emails`);
  }
}

async function requireEmailsSend() {
  const feature = await requireFeature("emailsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("emails.send");
  if (auth.error) return auth;
  return auth;
}

export async function getClubEmailSettings() {
  const feature = await requireFeature("emailsEnabled");
  if (feature.error) return { error: feature.error as string };
  const { ctx } = feature;

  const settings = await prisma.clubEmailSettings.findUnique({
    where: { clubId: ctx.clubId },
  });

  return {
    settings: {
      useCustomSmtp: settings?.useCustomSmtp ?? false,
      smtpHost: settings?.smtpHost ?? "",
      smtpPort: settings?.smtpPort ?? 587,
      smtpSecure: settings?.smtpSecure ?? false,
      smtpUser: settings?.smtpUser ?? "",
      smtpFrom: settings?.smtpFrom ?? "",
      smtpFromName: settings?.smtpFromName ?? "",
      hasPassword: Boolean(settings?.smtpPassword),
      lastSmtpError: settings?.lastSmtpError ?? null,
      lastSmtpFallbackAt: settings?.lastSmtpFallbackAt?.toISOString() ?? null,
    },
  };
}

export async function updateClubEmailSettings(data: {
  useCustomSmtp: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  smtpFromName?: string;
}) {
  const auth = await requireEmailsSend();
  if (auth.error) return auth;
  const { ctx } = auth;

  const existing = await prisma.clubEmailSettings.findUnique({
    where: { clubId: ctx.clubId },
  });

  const password =
    data.smtpPassword?.trim()
      ? data.smtpPassword.trim()
      : existing?.smtpPassword ?? null;

  await prisma.clubEmailSettings.upsert({
    where: { clubId: ctx.clubId },
    create: {
      clubId: ctx.clubId,
      useCustomSmtp: data.useCustomSmtp,
      smtpHost: data.smtpHost?.trim() || null,
      smtpPort: data.smtpPort ?? 587,
      smtpSecure: data.smtpSecure ?? false,
      smtpUser: data.smtpUser?.trim() || null,
      smtpPassword: password,
      smtpFrom: data.smtpFrom?.trim() || null,
      smtpFromName: data.smtpFromName?.trim() || null,
    },
    update: {
      useCustomSmtp: data.useCustomSmtp,
      smtpHost: data.smtpHost?.trim() || null,
      smtpPort: data.smtpPort ?? 587,
      smtpSecure: data.smtpSecure ?? false,
      smtpUser: data.smtpUser?.trim() || null,
      ...(data.smtpPassword?.trim() ? { smtpPassword: data.smtpPassword.trim() } : {}),
      smtpFrom: data.smtpFrom?.trim() || null,
      smtpFromName: data.smtpFromName?.trim() || null,
      lastSmtpError: null,
      lastSmtpFallbackAt: null,
    },
  });

  revalidateEmails();
  return { success: true };
}

export async function testClubSmtp(recipientEmail: string) {
  const auth = await requireEmailsSend();
  if (auth.error) return auth;
  const { ctx } = auth;

  const email = recipientEmail.trim().toLowerCase();
  if (!email.includes("@")) return { error: "INVALID_EMAIL" as const };

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { name: true, language: true },
  });
  if (!club) return { error: "NOT_FOUND" as const };

  const isFr = club.language !== "EN";
  const result = await testClubSmtpDirect(ctx.clubId, {
    to: email,
    subject: isFr
      ? `Test SMTP — ${club.name}`
      : `SMTP test — ${club.name}`,
    html: isFr
      ? `<p>Ceci est un email de test envoyé depuis la configuration SMTP de <strong>${club.name}</strong>.</p>`
      : `<p>This is a test email sent from <strong>${club.name}</strong> SMTP settings.</p>`,
  });

  if (!result.ok) return { error: result.error ?? "SEND_FAILED" };
  return { success: true };
}