import { prisma } from "@/lib/prisma";
import { getResend, getEmailFrom } from "@/lib/platform-integrations";
import { prepareBrandedEmail } from "@/lib/email-branding";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; cid?: string }>;
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
        ...(a.cid ? { content_id: a.cid } : {}),
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
  clubId?: string;
  daysLeft: number;
  locale: string;
  upgradeUrl: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const subject = isFr
    ? `Votre essai Rotary Minutes expire dans ${opts.daysLeft} jour${opts.daysLeft > 1 ? "s" : ""}`
    : `Your Rotary Minutes trial expires in ${opts.daysLeft} day${opts.daysLeft > 1 ? "s" : ""}`;
  const body = isFr
    ? `<p>Bonjour,</p><p>L'essai gratuit de <strong>${opts.clubName}</strong> sur Rotary Minutes expire dans <strong>${opts.daysLeft} jour(s)</strong>.</p><p><a class="cta-button" href="${opts.upgradeUrl}">Choisir une offre</a></p><p style="font-size:14px;color:#64748b">Continuez à rédiger vos procès-verbaux sans interruption.</p>`
    : `<p>Hello,</p><p>The free trial for <strong>${opts.clubName}</strong> on Rotary Minutes expires in <strong>${opts.daysLeft} day(s)</strong>.</p><p><a class="cta-button" href="${opts.upgradeUrl}">Choose a plan</a></p><p style="font-size:14px;color:#64748b">Keep writing your minutes without interruption.</p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export function welcomeClubEmail(opts: {
  clubName: string;
  clubId?: string;
  locale: string;
  dashboardUrl: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Félicitations ! <strong>${opts.clubName}</strong> est prêt sur Rotary Minutes.</p><p><a class="cta-button" href="${opts.dashboardUrl}">Accéder au tableau de bord</a></p>`
    : `<p>Congratulations! <strong>${opts.clubName}</strong> is ready on Rotary Minutes.</p><p><a class="cta-button" href="${opts.dashboardUrl}">Go to dashboard</a></p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr ? `Bienvenue sur Rotary Minutes — ${opts.clubName}` : `Welcome to Rotary Minutes — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export function duesInvoiceEmail(opts: {
  clubName: string;
  clubId?: string;
  memberName: string;
  periodLabel: string;
  amount: string;
  dueDate: string;
  locale: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Veuillez trouver ci-joint votre facture de cotisation pour la période <strong>${opts.periodLabel}</strong> au <strong>${opts.clubName}</strong>.</p><p>Montant : <strong>${opts.amount}</strong><br/>Échéance : <strong>${opts.dueDate}</strong></p>`
    : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>Please find attached your dues invoice for <strong>${opts.periodLabel}</strong> at <strong>${opts.clubName}</strong>.</p><p>Amount: <strong>${opts.amount}</strong><br/>Due date: <strong>${opts.dueDate}</strong></p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `Facture de cotisation — ${opts.clubName}`
      : `Dues invoice — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export function duesReceiptEmail(opts: {
  clubName: string;
  clubId?: string;
  memberName: string;
  periodLabel: string;
  amount: string;
  receiptNumber: string;
  locale: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Nous confirmons la réception de votre paiement de cotisation pour <strong>${opts.periodLabel}</strong>.</p><p>Montant : <strong>${opts.amount}</strong><br/>Référence : <strong>${opts.receiptNumber}</strong></p><p>Le reçu officiel est joint à cet email.</p>`
    : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>We confirm receipt of your dues payment for <strong>${opts.periodLabel}</strong>.</p><p>Amount: <strong>${opts.amount}</strong><br/>Reference: <strong>${opts.receiptNumber}</strong></p><p>The official receipt is attached to this email.</p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `Reçu de paiement — ${opts.clubName}`
      : `Payment receipt — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export function duesHistoryEmail(opts: {
  clubName: string;
  clubId?: string;
  memberName: string;
  fiscalYear: string;
  locale: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Veuillez trouver ci-joint l'historique de vos cotisations pour l'exercice <strong>${opts.fiscalYear}</strong> au <strong>${opts.clubName}</strong>.</p>`
    : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>Please find attached your dues payment history for fiscal year <strong>${opts.fiscalYear}</strong> at <strong>${opts.clubName}</strong>.</p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `Historique des cotisations — ${opts.fiscalYear}`
      : `Dues history — ${opts.fiscalYear}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export function minuteFinalizedEmail(opts: {
  clubName: string;
  clubId?: string;
  minuteTitle: string;
  verifyUrl: string;
  locale: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Le procès-verbal <strong>${opts.minuteTitle}</strong> de ${opts.clubName} est disponible.</p><p>Le PDF officiel est joint à cet email.</p><p><a class="cta-button" href="${opts.verifyUrl}">Vérifier l'authenticité en ligne</a></p>`
    : `<p>The minutes <strong>${opts.minuteTitle}</strong> for ${opts.clubName} are available.</p><p>The official PDF is attached to this email.</p><p><a class="cta-button" href="${opts.verifyUrl}">Verify authenticity online</a></p>`;
  const branded = prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `PV finalisé — ${opts.minuteTitle}`
      : `Minutes finalized — ${opts.minuteTitle}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}