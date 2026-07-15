import { prisma } from "@/lib/prisma";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";
import {
  logoAttachmentFromResult,
  logoSrcFromResult,
  resolveLogoForEmail,
  type EmailLogoResult,
} from "@/lib/email-logo";

export interface BrandedEmailOptions {
  clubName: string;
  clubAddressLine?: string | null;
  logoSrc?: string;
  logoAlt?: string;
  /** Logo généré (désignation club déjà dans le visuel). */
  logoIsGenerated?: boolean;
}

export interface BrandedEmailPackage {
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; cid: string }>;
}

export type ClubAddressFields = {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  meetingLocation?: string | null;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatClubAddressForEmail(club: ClubAddressFields | null | undefined): string | null {
  if (!club) return null;
  const parts: string[] = [];
  if (club.address?.trim()) parts.push(club.address.trim());
  const cityCountry = [club.city?.trim(), club.country?.trim()].filter(Boolean).join(", ");
  if (cityCountry) parts.push(cityCountry);
  if (!parts.length && club.meetingLocation?.trim()) {
    parts.push(club.meetingLocation.trim());
  }
  return parts.length ? parts.join(" — ") : null;
}

/**
 * En-tête email : logo club officiel avec espace de respiration, ou nom du club (pas de bloc-marque seul).
 */
function buildEmailHeaderBlock(opts: BrandedEmailOptions): string {
  const clubName = escapeHtml(opts.clubName);
  const clear = ROTARY_LOGO_DISPLAY.clearSpacePx;

  if (opts.logoSrc) {
    const nameRow = opts.logoIsGenerated
      ? ""
      : `<tr>
      <td align="center" style="padding:0 0 20px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:${ROTARY_BRAND.royalBlue}">
        ${clubName}
      </td>
    </tr>`;
    return `<tr>
      <td align="center" style="padding:0 0 8px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:${clear}px">
              <img src="${opts.logoSrc}" alt="${escapeHtml(opts.logoAlt ?? opts.clubName)}" height="${ROTARY_LOGO_DISPLAY.emailMaxHeightPx}" style="display:block;height:${ROTARY_LOGO_DISPLAY.emailMaxHeightPx}px;width:auto;max-width:${ROTARY_LOGO_DISPLAY.maxWidthPx}px;object-fit:contain;border:0;outline:none;text-decoration:none" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${nameRow}`;
  }

  return `<tr>
    <td align="center" style="padding:0 0 24px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:${ROTARY_BRAND.white};border:1px solid ${ROTARY_BRAND.border};border-radius:8px">
        <tr>
          <td style="padding:16px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:${ROTARY_BRAND.royalBlue};text-align:center;line-height:1.3">
            ${clubName}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/**
 * Mise en page email compatible clients, alignée charte Rotary (couleurs officielles, logo club).
 */
export function wrapBrandedEmail(bodyHtml: string, opts: BrandedEmailOptions): string {
  const clubName = escapeHtml(opts.clubName);
  const addressLine = opts.clubAddressLine?.trim()
    ? escapeHtml(opts.clubAddressLine.trim())
    : null;
  const headerBlock = buildEmailHeaderBlock(opts);
  const footerExtra = addressLine ? `<br />${addressLine}` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${clubName}</title>
</head>
<body style="margin:0;padding:0;background-color:${ROTARY_BRAND.offWhite};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${ROTARY_BRAND.offWhite}">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${ROTARY_BRAND.white};border-radius:12px;border:1px solid ${ROTARY_BRAND.border};overflow:hidden">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${ROTARY_BRAND.royalBlue} 0%,${ROTARY_BRAND.gold} 100%);font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${headerBlock}
                <tr>
                  <td style="font-size:16px;line-height:1.65;color:${ROTARY_BRAND.charcoal}">
                    <div class="email-body" style="font-size:16px;line-height:1.65;color:#334155">
                      ${bodyHtml}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${ROTARY_BRAND.border};padding-top:20px;font-size:12px;line-height:1.5;color:${ROTARY_BRAND.muted}">
                    <strong style="color:${ROTARY_BRAND.royalBlue}">${clubName}</strong>${footerExtra}
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
      background-color:${ROTARY_BRAND.gold};
      color:${ROTARY_BRAND.royalBlue} !important;
      font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
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

async function resolveClubAddressLine(
  opts: {
    clubId?: string;
    clubAddressLine?: string | null;
    club?: ClubAddressFields | null;
  }
): Promise<string | null> {
  if (opts.clubAddressLine?.trim()) return opts.clubAddressLine.trim();
  if (opts.club) return formatClubAddressForEmail(opts.club);

  if (opts.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: opts.clubId },
      select: {
        address: true,
        city: true,
        country: true,
        meetingLocation: true,
      },
    });
    return formatClubAddressForEmail(club);
  }

  return null;
}

export async function prepareBrandedEmail(
  bodyHtml: string,
  opts: {
    clubName: string;
    clubId?: string;
    club?: ClubAddressFields | null;
    clubAddressLine?: string | null;
    logoUrl?: string | null;
    baseUrl?: string;
    logo?: EmailLogoResult;
  }
): Promise<BrandedEmailPackage> {
  let logoUrl = opts.logoUrl;
  let clubAddressLine = opts.clubAddressLine?.trim() ?? null;

  const needsClubLookup =
    !!opts.clubId &&
    !opts.logo &&
    (!logoUrl || (!clubAddressLine && !opts.club));

  if (needsClubLookup) {
    const club = await prisma.club.findUnique({
      where: { id: opts.clubId },
      select: {
        logoUrl: true,
        address: true,
        city: true,
        country: true,
        meetingLocation: true,
      },
    });
    if (!logoUrl) logoUrl = club?.logoUrl;
    if (!clubAddressLine && !opts.club) {
      clubAddressLine = formatClubAddressForEmail(club);
    }
  } else if (!clubAddressLine) {
    clubAddressLine = await resolveClubAddressLine(opts);
  }

  const logo =
    opts.logo ??
    (opts.clubId
      ? resolveLogoForEmail(opts.clubId, logoUrl, opts.baseUrl, opts.clubName)
      : logoUrl
        ? resolveLogoForEmail("", logoUrl, opts.baseUrl, opts.clubName)
        : opts.clubName
          ? resolveLogoForEmail("", null, opts.baseUrl, opts.clubName)
          : {});

  const wrappedBody = bodyHtml.includes('class="email-body"')
    ? bodyHtml
    : `<div class="email-body">${bodyHtml}</div>`;

  const html = wrapBrandedEmail(wrappedBody, {
    clubName: opts.clubName,
    clubAddressLine,
    logoSrc: logoSrcFromResult(logo),
    logoAlt: opts.clubName,
    logoIsGenerated: !logoUrl,
  });

  const attachment = logoAttachmentFromResult(logo);
  return {
    html,
    attachments: attachment ? [attachment] : undefined,
  };
}