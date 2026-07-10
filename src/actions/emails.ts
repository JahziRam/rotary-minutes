"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { isEmailEnabled } from "@/lib/email";
import { sendClubEmail } from "@/lib/club-smtp";
import { buildClubEmailVars, renderEmailContent } from "@/lib/email-render";
import { prepareBrandedEmail } from "@/lib/email-branding";
import { appendEmailOpenPixel } from "@/lib/email-tracking";
import { logoSrcFromResult, resolveLogoForEmail } from "@/lib/email-logo";

function revalidateEmails() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/emails`);
    for (const section of ["compose", "templates", "contacts", "history"]) {
      revalidatePath(`/${loc}/emails/${section}`);
    }
    revalidatePath(`/${loc}/dashboard`);
  }
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

async function resolveRecipients(
  clubId: string,
  groupId?: string | null,
  recipients?: string[]
): Promise<string[]> {
  const emails = new Set<string>();
  if (groupId) {
    const links = await prisma.emailGroupContact.findMany({
      where: { groupId },
      include: { contact: true },
    });
    for (const link of links) emails.add(link.contact.email);
  }
  for (const r of recipients ?? []) emails.add(r);
  return [...emails];
}

export async function dispatchCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      club: true,
      group: {
        include: { contacts: { include: { contact: true } } },
      },
    },
  });
  if (!campaign) return { error: "NOT_FOUND" as const };

  const recipientList = await resolveRecipients(
    campaign.clubId,
    campaign.groupId,
    campaign.recipients
  );
  if (recipientList.length === 0) return { error: "NO_RECIPIENTS" as const };

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const emailOn = await isEmailEnabled();
  let sent = 0;
  let errors = 0;

  const { getAppBaseUrl } = await import("@/lib/app-url");
  const baseUrl = getAppBaseUrl();
  const locale = campaign.club.language === "EN" ? "en" : "fr";

  for (const recipient of recipientList) {
    const contact = await prisma.emailContact.findFirst({
      where: { clubId: campaign.clubId, email: recipient },
    });
    const emailLogo = resolveLogoForEmail(campaign.club.id, campaign.club.logoUrl, baseUrl);
    const vars = buildClubEmailVars({
      clubName: campaign.club.name,
      locale,
      clubLogo: logoSrcFromResult(emailLogo) ?? "",
      firstName: contact?.firstName ?? undefined,
      lastName: contact?.lastName ?? undefined,
      dashboardUrl: `${baseUrl}/${locale}/dashboard`,
    });
    const subject = renderEmailContent(campaign.subject, vars);
    const bodyHtml = renderEmailContent(campaign.body, vars);
    const branded = await prepareBrandedEmail(bodyHtml, {
      clubId: campaign.club.id,
      clubName: campaign.club.name,
      logo: emailLogo,
    });

    const log = await prisma.emailLog.create({
      data: {
        campaignId,
        recipient,
        status: "pending",
      },
    });

    let status = "skipped";
    let error: string | undefined;
    const html = emailOn
      ? appendEmailOpenPixel(branded.html, log.id, baseUrl)
      : branded.html;

    if (emailOn) {
      const result = await sendClubEmail(campaign.clubId, {
        to: recipient,
        subject,
        html,
        cc: campaign.cc.length ? campaign.cc : undefined,
        bcc: campaign.bcc.length ? campaign.bcc : undefined,
        replyTo: campaign.replyTo ?? undefined,
        attachments: branded.attachments,
      });
      if (result.ok) {
        status = "sent";
        sent++;
      } else {
        status = "failed";
        error = result.error;
        errors++;
      }
    } else {
      status = "simulated";
      sent++;
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status, error },
    });
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: errors === recipientList.length ? "FAILED" : "SENT",
      sentAt: new Date(),
      errorCount: errors,
      openCount: 0,
      clickCount: 0,
    },
  });

  return { success: true, sent, errors, simulated: !emailOn };
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createEmailContact(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags?: string;
}) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const contact = await prisma.emailContact.create({
    data: {
      clubId: auth.ctx.clubId,
      email: data.email.trim().toLowerCase(),
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      company: data.company || null,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    },
  });

  revalidateEmails();
  return { success: true, contact };
}

export async function deleteEmailContact(contactId: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  await prisma.emailContact.deleteMany({
    where: { id: contactId, clubId: auth.ctx.clubId },
  });

  revalidateEmails();
  return { success: true };
}

export async function importMembersAsContacts() {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const members = await prisma.member.findMany({
    where: { clubId: auth.ctx.clubId, isActive: true, email: { not: null } },
  });

  let imported = 0;
  for (const m of members) {
    if (!m.email) continue;
    await prisma.emailContact.upsert({
      where: { clubId_email: { clubId: auth.ctx.clubId, email: m.email } },
      update: {
        firstName: m.firstName,
        lastName: m.lastName,
      },
      create: {
        clubId: auth.ctx.clubId,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        tags: ["membre"],
      },
    });
    imported++;
  }

  revalidateEmails();
  return { success: true, imported };
}

export async function importContactsCsv(csv: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  let imported = 0;
  const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    const email = parts.find((p) => p.includes("@"));
    if (!email) continue;
    await prisma.emailContact.upsert({
      where: { clubId_email: { clubId: auth.ctx.clubId, email: email.toLowerCase() } },
      update: {},
      create: {
        clubId: auth.ctx.clubId,
        email: email.toLowerCase(),
        firstName: parts[0] !== email ? parts[0] : null,
        lastName: parts[1] && parts[1] !== email ? parts[1] : null,
      },
    });
    imported++;
  }

  revalidateEmails();
  return { success: true, imported };
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function createEmailGroup(data: { name: string; description?: string }) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const group = await prisma.emailGroup.create({
    data: {
      clubId: auth.ctx.clubId,
      name: data.name,
      description: data.description || null,
    },
  });

  revalidateEmails();
  return { success: true, group };
}

export async function deleteEmailGroup(groupId: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  await prisma.emailGroup.deleteMany({
    where: { id: groupId, clubId: auth.ctx.clubId },
  });

  revalidateEmails();
  return { success: true };
}

export async function setGroupContacts(groupId: string, contactIds: string[]) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const group = await prisma.emailGroup.findFirst({
    where: { id: groupId, clubId: auth.ctx.clubId },
  });
  if (!group) return { error: "NOT_FOUND" as const };

  await prisma.emailGroupContact.deleteMany({ where: { groupId } });
  if (contactIds.length) {
    await prisma.emailGroupContact.createMany({
      data: contactIds.map((contactId) => ({ groupId, contactId })),
      skipDuplicates: true,
    });
  }

  revalidateEmails();
  return { success: true };
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function saveEmailTemplate(data: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  if (data.id) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: data.id, clubId: auth.ctx.clubId, isSystem: false },
    });
    if (!existing) return { error: "NOT_FOUND" as const };
    const template = await prisma.emailTemplate.update({
      where: { id: data.id },
      data: { name: data.name, subject: data.subject, body: data.body },
    });
    revalidateEmails();
    return { success: true, template };
  }

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const template = await prisma.emailTemplate.create({
    data: {
      clubId: auth.ctx.clubId,
      slug: `${slug}-${Date.now()}`,
      name: data.name,
      subject: data.subject,
      body: data.body,
    },
  });

  revalidateEmails();
  return { success: true, template };
}

export async function deleteEmailTemplate(templateId: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  await prisma.emailTemplate.deleteMany({
    where: { id: templateId, clubId: auth.ctx.clubId, isSystem: false },
  });

  revalidateEmails();
  return { success: true };
}

// ─── Campaigns & compose ─────────────────────────────────────────────────────

export async function sendComposedEmail(data: {
  name: string;
  subject: string;
  body: string;
  groupId?: string;
  recipients?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  scheduledAt?: string;
  templateId?: string;
}) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const recipients = data.recipients ? parseEmails(data.recipients) : [];
  if (!data.groupId && recipients.length === 0) {
    return { error: "NO_RECIPIENTS" as const };
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      clubId: auth.ctx.clubId,
      templateId: data.templateId || null,
      groupId: data.groupId || null,
      name: data.name,
      subject: data.subject,
      body: data.body,
      recipients,
      cc: data.cc ? parseEmails(data.cc) : [],
      bcc: data.bcc ? parseEmails(data.bcc) : [],
      replyTo: data.replyTo || null,
      status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId: auth.ctx.clubId,
      userId: auth.ctx.userId,
      action: data.scheduledAt ? "EMAIL_SCHEDULED" : "EMAIL_COMPOSED",
      entity: "EmailCampaign",
      entityId: campaign.id,
    },
  });

  if (!data.scheduledAt) {
    const result = await dispatchCampaign(campaign.id);
    revalidateEmails();
    return { ...result, campaignId: campaign.id };
  }

  revalidateEmails();
  return { success: true, campaignId: campaign.id, scheduled: true };
}

export async function sendCampaignNow(campaignId: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id: campaignId, clubId: auth.ctx.clubId },
  });
  if (!campaign) return { error: "NOT_FOUND" as const };
  if (campaign.status === "SENT") return { error: "ALREADY_SENT" as const };

  const result = await dispatchCampaign(campaignId);
  revalidateEmails();
  return result;
}

export async function deleteCampaign(campaignId: string) {
  const auth = await requirePermission("emails.send");
  if (auth.error) return { error: auth.error };

  await prisma.emailCampaign.deleteMany({
    where: {
      id: campaignId,
      clubId: auth.ctx.clubId,
      status: { in: ["DRAFT", "SCHEDULED", "FAILED"] },
    },
  });

  revalidateEmails();
  return { success: true };
}

export async function processScheduledCampaigns() {
  const now = new Date();
  const due = await prisma.emailCampaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true },
  });

  let processed = 0;
  for (const c of due) {
    await dispatchCampaign(c.id);
    processed++;
  }
  return { processed };
}