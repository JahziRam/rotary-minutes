import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function isValidContactEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type ContactInboxConfig = {
  to: string;
  bcc: string;
};

/** Resolves landing contact form recipient (to) and blind copy (bcc) from super-admin settings. */
export async function getContactInboxConfig(): Promise<ContactInboxConfig | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: { contactToEmail: true, contactBccEmail: true, supportEmail: true },
  });

  const to = settings?.contactToEmail?.trim() || settings?.supportEmail?.trim() || "";
  if (!to || !isValidContactEmail(to)) return null;

  const bccRaw = settings?.contactBccEmail?.trim();
  const bcc = bccRaw && isValidContactEmail(bccRaw) ? bccRaw : to;

  return { to, bcc };
}