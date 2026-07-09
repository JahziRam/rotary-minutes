import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { COMPANY_LEGAL } from "@/lib/company-legal";
import { getAppBaseUrl } from "@/lib/app-url";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function getSignupNotifyEmail(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: { signupNotifyEmail: true, supportEmail: true, contactToEmail: true },
  });
  const email = settings?.signupNotifyEmail?.trim() || settings?.supportEmail?.trim() || "";
  return email.includes("@") ? email : null;
}

export async function notifySuperAdminNewClubSignup(data: {
  clubName: string;
  clubSlug: string;
  adminEmail: string;
  clubType: string;
  country?: string;
  locale: string;
}) {
  const to = await getSignupNotifyEmail();
  if (!to) return { ok: false as const, skipped: true as const };

  const baseUrl = getAppBaseUrl();
  const adminUrl = `${baseUrl}/${data.locale}/admin/clubs`;

  const subject = `[${COMPANY_LEGAL.productName}] Nouveau club — ${data.clubName}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;padding:24px">
    <h2 style="color:#0d2d52">Nouvelle inscription club</h2>
    <table style="border-collapse:collapse">
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Club</td><td><strong>${escapeHtml(data.clubName)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Type</td><td>${escapeHtml(data.clubType)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Pays</td><td>${escapeHtml(data.country ?? "—")}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Admin</td><td>${escapeHtml(data.adminEmail)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b">Slug</td><td><code>${escapeHtml(data.clubSlug)}</code></td></tr>
    </table>
    <p style="margin-top:20px"><a href="${adminUrl}" style="background:#f5a623;color:#071a30;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Voir dans Super Admin</a></p>
  </body></html>`;

  return sendEmail({ to, subject, html });
}