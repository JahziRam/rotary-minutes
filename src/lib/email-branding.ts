import {
  logoAttachmentFromResult,
  logoSrcFromResult,
  resolveLogoForEmail,
  type EmailLogoResult,
} from "@/lib/email-logo";
import { COMPANY_LEGAL, formatCompanyAddress } from "@/lib/company-legal";

export interface BrandedEmailOptions {
  clubName: string;
  logoSrc?: string;
  logoAlt?: string;
}

export interface BrandedEmailPackage {
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; cid: string }>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps email body HTML in a table-based, client-safe branded layout.
 */
export function wrapBrandedEmail(bodyHtml: string, opts: BrandedEmailOptions): string {
  const logoAlt = escapeHtml(opts.logoAlt ?? opts.clubName);
  const clubName = escapeHtml(opts.clubName);

  const logoBlock = opts.logoSrc
    ? `<tr>
        <td align="center" style="padding:0 0 24px 0">
          <img src="${opts.logoSrc}" alt="${logoAlt}" height="64" style="display:block;height:64px;width:auto;max-width:220px;object-fit:contain;border:0;outline:none;text-decoration:none" />
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${clubName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0d2d52 0%,#f5a623 100%);font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${logoBlock}
                <tr>
                  <td style="font-size:16px;line-height:1.65;color:#0f172a">
                    <div style="font-size:16px;line-height:1.65;color:#334155">
                      ${bodyHtml}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #e2e8f0;padding-top:20px;font-size:12px;line-height:1.5;color:#94a3b8">
                    <strong style="color:#64748b">${clubName}</strong><br />
                    ${escapeHtml(COMPANY_LEGAL.productName)} (${escapeHtml(COMPANY_LEGAL.productAlias)}) — ${escapeHtml(COMPANY_LEGAL.companyName)}<br />
                    ${escapeHtml(formatCompanyAddress(true))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <style>
    a.cta-button, .email-body a[href]:not(.plain-link) {
      display:inline-block;
      margin:16px 0 4px 0;
      padding:12px 24px;
      background-color:#f5a623;
      color:#071a30 !important;
      font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      font-size:15px;
      font-weight:600;
      text-decoration:none;
      border-radius:8px;
      line-height:1.2;
    }
    .email-body p { margin:0 0 14px 0; }
    .email-body ul { margin:0 0 14px 0; padding-left:20px; }
    .email-body li { margin-bottom:6px; }
  </style>
</body>
</html>`;
}

/**
 * Builds branded HTML and optional logo attachment from raw club logo URL.
 */
export function prepareBrandedEmail(
  bodyHtml: string,
  opts: { clubName: string; clubId?: string; logoUrl?: string | null; baseUrl?: string; logo?: EmailLogoResult }
): BrandedEmailPackage {
  const logo =
    opts.logo ??
    (opts.clubId && opts.logoUrl
      ? resolveLogoForEmail(opts.clubId, opts.logoUrl, opts.baseUrl)
      : {});

  const wrappedBody = bodyHtml.includes('class="email-body"')
    ? bodyHtml
    : `<div class="email-body">${bodyHtml}</div>`;

  const html = wrapBrandedEmail(wrappedBody, {
    clubName: opts.clubName,
    logoSrc: logoSrcFromResult(logo),
    logoAlt: opts.clubName,
  });

  const attachment = logoAttachmentFromResult(logo);
  return {
    html,
    attachments: attachment ? [attachment] : undefined,
  };
}