import { isDataUrl, parseDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";

export interface EmailLogoResult {
  /** Inline image src (data URL or absolute HTTP URL) */
  url?: string;
  /** Content-ID for inline attachment (use with cid: in img src) */
  cid?: string;
  /** Raw attachment content (Buffer) */
  content?: Buffer;
  /** MIME type when content is embedded inline */
  mime?: string;
}

const LOGO_CID = "club-logo";

/**
 * Resolves a club logo for email rendering.
 * - HTTP / external URLs → inline `url`
 * - Data URLs → inline `url` (base64) plus optional `cid` + `content` for attachment
 */
export function resolveLogoForEmail(
  clubId: string,
  logoUrl?: string | null,
  baseUrl?: string
): EmailLogoResult {
  if (!logoUrl) return {};

  if (isDataUrl(logoUrl)) {
    const parsed = parseDataUrl(logoUrl);
    if (!parsed) return { url: logoUrl };
    return {
      url: logoUrl,
      cid: LOGO_CID,
      content: parsed.buffer,
      mime: parsed.mime,
    };
  }

  const resolved = resolveClubLogoUrl(clubId, logoUrl, baseUrl) ?? logoUrl;
  return { url: resolved };
}

export function logoSrcFromResult(logo: EmailLogoResult): string | undefined {
  if (logo.cid) return `cid:${logo.cid}`;
  return logo.url;
}

function mimeToExtension(mime?: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

export function logoAttachmentFromResult(
  logo: EmailLogoResult
): { filename: string; content: Buffer; cid: string } | undefined {
  if (!logo.cid || !logo.content) return undefined;
  return {
    filename: `club-logo.${mimeToExtension(logo.mime)}`,
    content: logo.content,
    cid: logo.cid,
  };
}