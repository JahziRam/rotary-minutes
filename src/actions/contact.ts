"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  assertContactRateLimit,
  validateContactForm,
  type ContactFormPayload,
} from "@/lib/contact-form-guard";
import { getContactInboxConfig } from "@/lib/contact-inbox";
import { COMPANY_LEGAL } from "@/lib/company-legal";

const TOPIC_LABELS: Record<string, { fr: string; en: string; es: string }> = {
  demo: { fr: "Démonstration", en: "Demo request", es: "Solicitud de demo" },
  pricing: { fr: "Tarifs & abonnement", en: "Pricing & subscription", es: "Tarifas y suscripción" },
  support: { fr: "Support technique", en: "Technical support", es: "Soporte técnico" },
  partnership: { fr: "Partenariat", en: "Partnership", es: "Colaboración" },
  other: { fr: "Autre demande", en: "Other inquiry", es: "Otra consulta" },
};

function topicLabel(topic: string, locale: string): string {
  const labels = TOPIC_LABELS[topic];
  if (!labels) return topic;
  if (locale === "fr") return labels.fr;
  if (locale === "es") return labels.es;
  return labels.en;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildContactEmailHtml(data: {
  name: string;
  email: string;
  clubName?: string;
  topic: string;
  message: string;
  locale: string;
}) {
  const isFr = data.locale === "fr";
  const topicText = topicLabel(data.topic, data.locale);
  const clubLine = data.clubName
    ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top">${isFr ? "Club" : "Club"}</td><td style="padding:8px 0;font-size:14px;color:#0f172a">${escapeHtml(data.clubName)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${data.locale}">
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Inter,Segoe UI,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <tr><td style="height:4px;background:linear-gradient(90deg,#0d2d52,#f5a623)"></td></tr>
    <tr>
      <td style="padding:28px">
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">${COMPANY_LEGAL.productName}</p>
        <h1 style="margin:0 0 20px;font-size:20px;color:#0f172a">${isFr ? "Nouveau message de contact" : "New contact message"}</h1>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;vertical-align:top">${isFr ? "Nom" : "Name"}</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600">${escapeHtml(data.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top">Email</td><td style="padding:8px 0;font-size:14px;color:#0f172a"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
          ${clubLine}
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top">${isFr ? "Sujet" : "Topic"}</td><td style="padding:8px 0;font-size:14px;color:#0f172a">${escapeHtml(topicText)}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600">${isFr ? "Message" : "Message"}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(data.message)}</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function resolveClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip")?.trim() ?? null;
}

export async function submitContactForm(payload: ContactFormPayload) {
  const validated = validateContactForm(payload);
  if (!validated.ok) return { error: validated.error as string };

  const ip = await resolveClientIp();
  const rate = await assertContactRateLimit(validated.data.email, ip);
  if (!rate.ok) return { error: rate.error };

  const inbox = await getContactInboxConfig();
  if (!inbox) return { error: "NOT_CONFIGURED" };

  const submission = await prisma.contactSubmission.create({
    data: {
      name: validated.data.name,
      email: validated.data.email,
      clubName: validated.data.clubName || null,
      topic: validated.data.topic,
      message: validated.data.message,
      locale: validated.data.locale,
      ipAddress: ip,
      status: "NEW",
      emailSent: false,
    },
  });

  const topicLabelText = topicLabel(validated.data.topic, validated.data.locale);
  const subject = `[${COMPANY_LEGAL.productName}] Contact — ${topicLabelText}`;

  const html = buildContactEmailHtml(validated.data);
  const text = [
    `${validated.data.name} <${validated.data.email}>`,
    validated.data.clubName ? `Club: ${validated.data.clubName}` : null,
    `Topic: ${topicLabelText}`,
    "",
    validated.data.message,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendEmail({
    to: inbox.to,
    cc: validated.data.email,
    bcc: inbox.bcc,
    replyTo: validated.data.email,
    subject,
    html,
    text,
  });

  await prisma.auditLog.create({
    data: {
      action: "CONTACT_FORM",
      entity: "Contact",
      ipAddress: ip,
      metadata: {
        email: validated.data.email,
        name: validated.data.name,
        topic: validated.data.topic,
        sent: result.ok,
      },
    },
  });

  if (!result.ok) {
    if (result.error === "EMAIL_DISABLED") {
      return { error: "EMAIL_DISABLED" };
    }
    return { error: "SEND_FAILED" };
  }

  await prisma.contactSubmission.update({
    where: { id: submission.id },
    data: { emailSent: true },
  });

  return { success: true };
}