/**
 * Client-safe image helpers (no sharp / Node builtins).
 * Server-only optimization lives in image-storage.ts.
 */

/** Max decoded source file size before processing (5 MB). */
export const MAX_IMAGE_SOURCE_BYTES = 5 * 1024 * 1024;

/**
 * Max stored binary size after optimization (~120 KB → ~160 KB data URL).
 */
export const MAX_STORED_IMAGE_BYTES = 120 * 1024;

/** @deprecated use MAX_STORED_IMAGE_BYTES */
export const MAX_IMAGE_BYTES = MAX_STORED_IMAGE_BYTES;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** True for image data URLs (`data:image/...`). */
export function isDataUrl(value: string): boolean {
  return value.startsWith("data:image/");
}

export function validateImageDataUrl(dataUrl: string): string | null {
  if (!isDataUrl(dataUrl)) return "INVALID_FORMAT";
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return "INVALID_FORMAT";
  const mime = match[1].toLowerCase();
  if (mime !== "image/jpeg" && !ALLOWED_IMAGE_TYPES.has(mime)) {
    return "INVALID_TYPE";
  }
  // Length check without Buffer (works on client too)
  const b64 = match[2];
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_STORED_IMAGE_BYTES) return "TOO_LARGE";
  return null;
}

/** Server-oriented parse — uses Buffer (call from API routes / actions). */
export function parseDataUrl(
  dataUrl: string
): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
}
