import { createHmac, timingSafeEqual } from "crypto";
import { getAppBaseUrl } from "@/lib/app-url";

/** 1×1 transparent GIF returned by the open-tracking endpoint. */
export const EMAIL_TRACKING_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function trackingSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for email open tracking");
  return secret;
}

export function createEmailOpenToken(logId: string): string {
  return createHmac("sha256", trackingSecret())
    .update(`email-open:${logId}`)
    .digest("base64url")
    .slice(0, 22);
}

export function verifyEmailOpenToken(logId: string, token: string): boolean {
  const expected = createEmailOpenToken(logId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildEmailOpenPixelUrl(logId: string, baseUrl?: string): string {
  const origin = baseUrl ?? getAppBaseUrl();
  const token = createEmailOpenToken(logId);
  return `${origin}/api/email/track/open/${logId}?t=${encodeURIComponent(token)}`;
}

/** Inserts a tracking pixel before </body> (or appends at end). */
export function appendEmailOpenPixel(
  html: string,
  logId: string,
  baseUrl?: string
): string {
  const pixelUrl = buildEmailOpenPixelUrl(logId, baseUrl);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;opacity:0" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}