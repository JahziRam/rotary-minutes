import { prisma } from "@/lib/prisma";
import { getAppName } from "@/lib/app-settings";
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
        // Resend SDK maps contentId → content_id for inline cid: references
        ...(a.cid ? { contentId: a.cid } : {}),
      })),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function trialReminderEmail(opts: {
  clubName: string;
  clubId?: string;
  daysLeft: number;
  locale: string;
  upgradeUrl: string;
  logoUrl?: string;
}) {
  const appName = await getAppName();
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const subject = isFr
    ? `Votre essai ${appName} expire dans ${opts.daysLeft} jour${opts.daysLeft > 1 ? "s" : ""}`
    : isEs
      ? `Su prueba de ${appName} expira en ${opts.daysLeft} día${opts.daysLeft > 1 ? "s" : ""}`
      : `Your ${appName} trial expires in ${opts.daysLeft} day${opts.daysLeft > 1 ? "s" : ""}`;
  const body = isFr
    ? `<p>Bonjour,</p><p>L'essai gratuit de <strong>${opts.clubName}</strong> sur ${appName} expire dans <strong>${opts.daysLeft} jour(s)</strong>.</p><p><a class="cta-button" href="${opts.upgradeUrl}">Choisir une offre</a></p><p style="font-size:14px;color:#64748b">Continuez à rédiger vos procès-verbaux sans interruption.</p>`
    : isEs
      ? `<p>Hola,</p><p>La prueba gratuita de <strong>${opts.clubName}</strong> en ${appName} expira en <strong>${opts.daysLeft} día(s)</strong>.</p><p><a class="cta-button" href="${opts.upgradeUrl}">Elegir un plan</a></p><p style="font-size:14px;color:#64748b">Siga redactando sus actas sin interrupción.</p>`
      : `<p>Hello,</p><p>The free trial for <strong>${opts.clubName}</strong> on ${appName} expires in <strong>${opts.daysLeft} day(s)</strong>.</p><p><a class="cta-button" href="${opts.upgradeUrl}">Choose a plan</a></p><p style="font-size:14px;color:#64748b">Keep writing your minutes without interruption.</p>`;
  const branded = await prepareBrandedEmail(body, {
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

export async function welcomeClubEmail(opts: {
  clubName: string;
  clubId?: string;
  locale: string;
  dashboardUrl: string;
  logoUrl?: string;
}) {
  const appName = await getAppName();
  const isFr = opts.locale === "fr";
  const body = isFr
    ? `<p>Félicitations ! <strong>${opts.clubName}</strong> est prêt sur ${appName}.</p><p><a class="cta-button" href="${opts.dashboardUrl}">Accéder au tableau de bord</a></p>`
    : `<p>Congratulations! <strong>${opts.clubName}</strong> is ready on ${appName}.</p><p><a class="cta-button" href="${opts.dashboardUrl}">Go to dashboard</a></p>`;
  const branded = await prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr ? `Bienvenue sur ${appName} — ${opts.clubName}` : `Welcome to ${appName} — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export async function duesInvoiceEmail(opts: {
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
  const branded = await prepareBrandedEmail(body, {
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

export async function duesReceiptEmail(opts: {
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
  const branded = await prepareBrandedEmail(body, {
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

export async function duesHistoryEmail(opts: {
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
  const branded = await prepareBrandedEmail(body, {
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

export async function minuteFinalizedEmail(opts: {
  clubName: string;
  clubId?: string;
  minuteTitle: string;
  verifyUrl: string;
  locale: string;
  logoUrl?: string;
}) {
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const body = isFr
    ? `<p>Le procès-verbal <strong>${opts.minuteTitle}</strong> de ${opts.clubName} est disponible.</p><p>Le PDF officiel est joint à cet email.</p><p><a class="cta-button" href="${opts.verifyUrl}">Vérifier l'authenticité en ligne</a></p>`
    : isEs
      ? `<p>El acta <strong>${opts.minuteTitle}</strong> de ${opts.clubName} está disponible.</p><p>El PDF oficial está adjunto.</p><p><a class="cta-button" href="${opts.verifyUrl}">Verificar autenticidad en línea</a></p>`
      : `<p>The minutes <strong>${opts.minuteTitle}</strong> for ${opts.clubName} are available.</p><p>The official PDF is attached to this email.</p><p><a class="cta-button" href="${opts.verifyUrl}">Verify authenticity online</a></p>`;
  const branded = await prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `PV finalisé — ${opts.minuteTitle}`
      : isEs
        ? `Acta finalizada — ${opts.minuteTitle}`
        : `Minutes finalized — ${opts.minuteTitle}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

/** Email asking the president (or approvers) to review draft minutes. */
export async function memberLoginEmail(opts: {
  clubName: string;
  clubId?: string;
  memberName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  locale: string;
  logoUrl?: string;
  isNewAccount?: boolean;
}) {
  const appName = await getAppName();
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const intro = opts.isNewAccount
    ? isFr
      ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Un compte a été créé pour vous sur ${appName} au sein du club <strong>${opts.clubName}</strong>.</p>`
      : isEs
        ? `<p>Hola <strong>${opts.memberName}</strong>,</p><p>Se ha creado una cuenta para usted en ${appName} en el club <strong>${opts.clubName}</strong>.</p>`
        : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>An account has been created for you on ${appName} at <strong>${opts.clubName}</strong>.</p>`
    : isFr
      ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Voici vos identifiants de connexion pour ${appName} — <strong>${opts.clubName}</strong>.</p>`
      : isEs
        ? `<p>Hola <strong>${opts.memberName}</strong>,</p><p>Aquí están sus credenciales de acceso a ${appName} — <strong>${opts.clubName}</strong>.</p>`
        : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>Here are your login credentials for ${appName} — <strong>${opts.clubName}</strong>.</p>`;
  const credentials = isFr
    ? `<p><strong>Email :</strong> ${opts.email}<br/><strong>Mot de passe temporaire :</strong> ${opts.tempPassword}</p><p style="font-size:14px;color:#64748b">Changez ce mot de passe après votre première connexion.</p>`
    : isEs
      ? `<p><strong>Email:</strong> ${opts.email}<br/><strong>Contraseña temporal:</strong> ${opts.tempPassword}</p><p style="font-size:14px;color:#64748b">Cambie esta contraseña después de su primer inicio de sesión.</p>`
      : `<p><strong>Email:</strong> ${opts.email}<br/><strong>Temporary password:</strong> ${opts.tempPassword}</p><p style="font-size:14px;color:#64748b">Please change this password after your first login.</p>`;
  const cta = isFr
    ? `<p><a class="cta-button" href="${opts.loginUrl}">Se connecter</a></p>`
    : isEs
      ? `<p><a class="cta-button" href="${opts.loginUrl}">Iniciar sesión</a></p>`
      : `<p><a class="cta-button" href="${opts.loginUrl}">Sign in</a></p>`;
  const body = `${intro}${credentials}${cta}`;
  const branded = await prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `Vos identifiants ${appName} — ${opts.clubName}`
      : isEs
        ? `Sus credenciales ${appName} — ${opts.clubName}`
        : `Your ${appName} login — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export async function passwordResetEmail(opts: {
  appName?: string;
  userName: string;
  resetUrl: string;
  locale: string;
}) {
  const appName = opts.appName ?? (await getAppName());
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const body = isFr
    ? `<p>Bonjour <strong>${opts.userName}</strong>,</p><p>Vous avez demandé la réinitialisation de votre mot de passe ${appName}.</p><p><a class="cta-button" href="${opts.resetUrl}">Réinitialiser mon mot de passe</a></p><p style="font-size:14px;color:#64748b">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    : isEs
      ? `<p>Hola <strong>${opts.userName}</strong>,</p><p>Ha solicitado restablecer su contraseña de ${appName}.</p><p><a class="cta-button" href="${opts.resetUrl}">Restablecer contraseña</a></p><p style="font-size:14px;color:#64748b">Este enlace expira en 1 hora. Si no fue usted, ignore este correo.</p>`
      : `<p>Hello <strong>${opts.userName}</strong>,</p><p>You requested a password reset for ${appName}.</p><p><a class="cta-button" href="${opts.resetUrl}">Reset my password</a></p><p style="font-size:14px;color:#64748b">This link expires in 1 hour. If you did not request this, ignore this email.</p>`;
  const branded = await prepareBrandedEmail(body, { clubName: appName });
  return {
    subject: isFr
      ? `Réinitialisation du mot de passe — ${appName}`
      : isEs
        ? `Restablecer contraseña — ${appName}`
        : `Password reset — ${appName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export async function memberWelcomeEmail(opts: {
  clubName: string;
  clubId?: string;
  memberName: string;
  email: string;
  loginUrl: string;
  locale: string;
  logoUrl?: string;
}) {
  const appName = await getAppName();
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const body = isFr
    ? `<p>Bonjour <strong>${opts.memberName}</strong>,</p><p>Votre adhésion au club <strong>${opts.clubName}</strong> a été approuvée sur ${appName}.</p><p>Connectez-vous avec l'email <strong>${opts.email}</strong> et le mot de passe que vous avez choisi lors de l'inscription.</p><p><a class="cta-button" href="${opts.loginUrl}">Accéder à l'application</a></p>`
    : isEs
      ? `<p>Hola <strong>${opts.memberName}</strong>,</p><p>Su adhesión al club <strong>${opts.clubName}</strong> ha sido aprobada en ${appName}.</p><p>Inicie sesión con el email <strong>${opts.email}</strong> y la contraseña elegida al registrarse.</p><p><a class="cta-button" href="${opts.loginUrl}">Acceder a la aplicación</a></p>`
      : `<p>Hello <strong>${opts.memberName}</strong>,</p><p>Your membership at <strong>${opts.clubName}</strong> has been approved on ${appName}.</p><p>Sign in with <strong>${opts.email}</strong> and the password you chose when registering.</p><p><a class="cta-button" href="${opts.loginUrl}">Go to the app</a></p>`;
  const branded = await prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `Adhésion approuvée — ${opts.clubName}`
      : isEs
        ? `Adhesión aprobada — ${opts.clubName}`
        : `Membership approved — ${opts.clubName}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}

export async function minuteReviewRequestEmail(opts: {
  clubName: string;
  clubId?: string;
  minuteTitle: string;
  reviewUrl: string;
  locale: string;
  logoUrl?: string;
  submittedByName?: string;
}) {
  const isFr = opts.locale === "fr";
  const isEs = opts.locale === "es";
  const by = opts.submittedByName
    ? isFr
      ? ` par ${opts.submittedByName}`
      : isEs
        ? ` por ${opts.submittedByName}`
        : ` by ${opts.submittedByName}`
    : "";
  const body = isFr
    ? `<p>Un procès-verbal a été soumis pour validation${by}.</p><p><strong>${opts.minuteTitle}</strong> — ${opts.clubName}</p><p>Merci de relire et d'approuver ou de demander des corrections.</p><p><a class="cta-button" href="${opts.reviewUrl}">Ouvrir le PV</a></p>`
    : isEs
      ? `<p>Se ha enviado un acta para validación${by}.</p><p><strong>${opts.minuteTitle}</strong> — ${opts.clubName}</p><p>Revísela y apruébela o solicite correcciones.</p><p><a class="cta-button" href="${opts.reviewUrl}">Abrir el acta</a></p>`
      : `<p>Minutes have been submitted for validation${by}.</p><p><strong>${opts.minuteTitle}</strong> — ${opts.clubName}</p><p>Please review and approve or request changes.</p><p><a class="cta-button" href="${opts.reviewUrl}">Open minutes</a></p>`;
  const branded = await prepareBrandedEmail(body, {
    clubName: opts.clubName,
    clubId: opts.clubId,
    logoUrl: opts.logoUrl,
  });
  return {
    subject: isFr
      ? `PV à valider — ${opts.minuteTitle}`
      : isEs
        ? `Acta por validar — ${opts.minuteTitle}`
        : `Minutes to validate — ${opts.minuteTitle}`,
    html: branded.html,
    attachments: branded.attachments,
  };
}