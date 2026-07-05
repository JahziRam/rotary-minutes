import { prisma } from "@/lib/prisma";
import { getResend, getEmailFrom } from "@/lib/platform-integrations";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export async function isEmailEnabled(): Promise<boolean> {
  const [settings, resend] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "global" } }),
    getResend(),
  ]);
  return !!(settings?.resendEnabled && resend);
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!(await isEmailEnabled())) {
    console.info("[email] Skipped (Resend disabled):", options.subject, "→", options.to);
    return { ok: false, error: "EMAIL_DISABLED" };
  }

  const resend = await getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_NOT_CONFIGURED" };
  }

  const from = await getEmailFrom();

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
      })),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export function trialReminderEmail(opts: {
  clubName: string;
  daysLeft: number;
  locale: string;
  upgradeUrl: string;
}) {
  const isFr = opts.locale === "fr";
  const subject = isFr
    ? `Votre essai Rotary Minutes expire dans ${opts.daysLeft} jour${opts.daysLeft > 1 ? "s" : ""}`
    : `Your Rotary Minutes trial expires in ${opts.daysLeft} day${opts.daysLeft > 1 ? "s" : ""}`;
  const html = isFr
    ? `<p>Bonjour,</p><p>L'essai gratuit de <strong>${opts.clubName}</strong> sur Rotary Minutes expire dans <strong>${opts.daysLeft} jour(s)</strong>.</p><p><a href="${opts.upgradeUrl}">Choisir une offre</a> pour continuer à rédiger vos procès-verbaux sans interruption.</p>`
    : `<p>Hello,</p><p>The free trial for <strong>${opts.clubName}</strong> on Rotary Minutes expires in <strong>${opts.daysLeft} day(s)</strong>.</p><p><a href="${opts.upgradeUrl}">Choose a plan</a> to keep writing your minutes without interruption.</p>`;
  return { subject, html };
}

export function welcomeClubEmail(opts: { clubName: string; locale: string; dashboardUrl: string }) {
  const isFr = opts.locale === "fr";
  return {
    subject: isFr ? `Bienvenue sur Rotary Minutes — ${opts.clubName}` : `Welcome to Rotary Minutes — ${opts.clubName}`,
    html: isFr
      ? `<p>Félicitations ! <strong>${opts.clubName}</strong> est prêt sur Rotary Minutes.</p><p><a href="${opts.dashboardUrl}">Accéder au tableau de bord</a></p>`
      : `<p>Congratulations! <strong>${opts.clubName}</strong> is ready on Rotary Minutes.</p><p><a href="${opts.dashboardUrl}">Go to dashboard</a></p>`,
  };
}

export function minuteFinalizedEmail(opts: {
  clubName: string;
  minuteTitle: string;
  verifyUrl: string;
  locale: string;
}) {
  const isFr = opts.locale === "fr";
  return {
    subject: isFr
      ? `PV finalisé — ${opts.minuteTitle}`
      : `Minutes finalized — ${opts.minuteTitle}`,
    html: isFr
      ? `<p>Le procès-verbal <strong>${opts.minuteTitle}</strong> de ${opts.clubName} a été finalisé.</p><p><a href="${opts.verifyUrl}">Vérifier l'authenticité</a></p>`
      : `<p>The minutes <strong>${opts.minuteTitle}</strong> for ${opts.clubName} have been finalized.</p><p><a href="${opts.verifyUrl}">Verify authenticity</a></p>`,
  };
}