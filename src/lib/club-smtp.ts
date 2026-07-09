import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { sendEmail, type SendEmailOptions } from "@/lib/email";

const SMTP_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;

export type ClubEmailSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
  provider: "resend" | "smtp";
  smtpFallback?: boolean;
  smtpError?: string;
};

type ClubSmtpSettings = {
  useCustomSmtp: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpFromName: string | null;
};

function isSmtpFullyConfigured(settings: ClubSmtpSettings): boolean {
  return !!(
    settings.useCustomSmtp &&
    settings.smtpHost?.trim() &&
    settings.smtpUser?.trim() &&
    settings.smtpPassword
  );
}

async function clearSmtpFailure(clubId: string) {
  await prisma.clubEmailSettings.updateMany({
    where: { clubId, OR: [{ lastSmtpError: { not: null } }, { lastSmtpFallbackAt: { not: null } }] },
    data: { lastSmtpError: null, lastSmtpFallbackAt: null },
  });
}

async function recordSmtpFailure(clubId: string, error: string) {
  await prisma.clubEmailSettings.upsert({
    where: { clubId },
    create: {
      clubId,
      useCustomSmtp: true,
      lastSmtpError: error,
      lastSmtpFallbackAt: new Date(),
    },
    update: {
      lastSmtpError: error,
      lastSmtpFallbackAt: new Date(),
    },
  });
}

async function notifyClubSmtpFailure(clubId: string, error: string) {
  const since = new Date(Date.now() - SMTP_NOTIFY_COOLDOWN_MS);
  const recent = await prisma.notification.findFirst({
    where: {
      clubId,
      type: "SYSTEM",
      createdAt: { gte: since },
      title: { contains: "SMTP" },
    },
    select: { id: true },
  });
  if (recent) return;

  const [club, admins] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId },
      select: { language: true },
    }),
    prisma.clubMembership.findMany({
      where: {
        clubId,
        role: { in: ["ADMIN", "PRESIDENT", "PUBLIC_IMAGE_CHAIR", "SECRETARY"] },
      },
      select: { userId: true },
    }),
  ]);

  if (!admins.length) return;

  const locale = club?.language === "EN" ? "en" : "fr";
  const title =
    locale === "fr"
      ? "Configuration SMTP incorrecte"
      : "Invalid SMTP configuration";
  const message =
    locale === "fr"
      ? `L'envoi a été relayé via Resend (plateforme). Vérifiez votre SMTP dans Emails. Erreur : ${error}`
      : `Sending was relayed via Resend (platform). Check your SMTP under Emails. Error: ${error}`;

  await prisma.notification.createMany({
    data: admins.map((m) => ({
      userId: m.userId,
      clubId,
      type: "SYSTEM" as const,
      title,
      message,
      link: `/${locale}/emails`,
    })),
    skipDuplicates: true,
  });
}

async function fallbackToResend(
  clubId: string,
  options: SendEmailOptions,
  smtpError: string
): Promise<ClubEmailSendResult> {
  await recordSmtpFailure(clubId, smtpError);
  await notifyClubSmtpFailure(clubId, smtpError);

  const resendResult = await sendEmail(options);
  return {
    ...resendResult,
    provider: "resend",
    smtpFallback: true,
    smtpError,
  };
}

async function sendViaClubSmtp(
  settings: ClubSmtpSettings,
  options: SendEmailOptions
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const fromAddress = settings.smtpFrom?.trim() || settings.smtpUser!;
  const fromName = settings.smtpFromName?.trim();
  const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost!,
    port: settings.smtpPort ?? 587,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser!,
      pass: settings.smtpPassword!,
    },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        cid: a.cid,
      })),
    });
    return { ok: true, id: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown SMTP error";
    return { ok: false, error: msg };
  }
}

async function loadClubSmtpSettings(clubId: string): Promise<ClubSmtpSettings | null> {
  const settings = await prisma.clubEmailSettings.findUnique({
    where: { clubId },
  });
  if (!settings) return null;
  return {
    useCustomSmtp: settings.useCustomSmtp,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword,
    smtpFrom: settings.smtpFrom,
    smtpFromName: settings.smtpFromName,
  };
}

/**
 * Default: platform Resend (super-admin config).
 * Optional club SMTP when enabled and valid; on failure or misconfiguration, notify club and fall back to Resend.
 */
export async function sendClubEmail(
  clubId: string,
  options: SendEmailOptions
): Promise<ClubEmailSendResult> {
  const settings = await loadClubSmtpSettings(clubId);

  if (!settings?.useCustomSmtp) {
    const result = await sendEmail(options);
    return { ...result, provider: "resend" };
  }

  if (!isSmtpFullyConfigured(settings)) {
    const error =
      settings.useCustomSmtp && !settings.smtpHost?.trim()
        ? "SMTP host missing"
        : settings.useCustomSmtp && !settings.smtpUser?.trim()
          ? "SMTP user missing"
          : "SMTP password missing";
    return fallbackToResend(clubId, options, error);
  }

  const smtpResult = await sendViaClubSmtp(settings, options);
  if (smtpResult.ok) {
    await clearSmtpFailure(clubId);
    return { ...smtpResult, provider: "smtp" };
  }

  console.warn("[club-smtp] Custom SMTP failed, falling back to Resend:", smtpResult.error);
  return fallbackToResend(clubId, options, smtpResult.error ?? "SMTP send failed");
}

/** Test SMTP only — no Resend fallback (for the settings panel). */
export async function testClubSmtpDirect(
  clubId: string,
  options: SendEmailOptions
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const settings = await loadClubSmtpSettings(clubId);
  if (!settings?.useCustomSmtp) {
    return { ok: false, error: "CUSTOM_SMTP_DISABLED" };
  }
  if (!isSmtpFullyConfigured(settings)) {
    return { ok: false, error: "SMTP_INCOMPLETE" };
  }
  const result = await sendViaClubSmtp(settings, options);
  if (result.ok) await clearSmtpFailure(clubId);
  return result;
}