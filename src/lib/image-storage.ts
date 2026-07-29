/**
 * Server image optimization (sharp — do not import this module from client components).
 * Client-safe helpers: import from `@/lib/image-data-url` instead.
 */

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SOURCE_BYTES,
  MAX_STORED_IMAGE_BYTES,
} from "@/lib/image-data-url";

export {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SOURCE_BYTES,
  MAX_STORED_IMAGE_BYTES,
  parseDataUrl,
  validateImageDataUrl,
  MAX_IMAGE_BYTES,
  isDataUrl,
} from "@/lib/image-data-url";

/** Profile photos & club logos (compressed pipeline). Default: enabled. */
export function areImageUploadsEnabled(): boolean {
  if (process.env.IMAGE_UPLOADS_ENABLED === "false") return false;
  return true;
}

/** @deprecated prefer areDocumentUploadsEnabled from document-storage */
export function areUploadsEnabled(): boolean {
  if (process.env.DOCUMENT_UPLOADS_ENABLED === "false") return false;
  if (process.env.UPLOADS_ENABLED === "false") return false;
  return true;
}

export type OptimizeImageOptions = {
  /** Longest edge in px (default 400 for avatars). */
  maxEdge?: number;
  /** JPEG quality 1–100 (default 80). */
  quality?: number;
  /** Hard cap on output binary size (default MAX_STORED_IMAGE_BYTES). */
  maxStoredBytes?: number;
};

/**
 * Resize + JPEG-encode an image buffer. Retries with lower quality if over cap.
 */
export async function optimizeImageBuffer(
  input: Buffer,
  options: OptimizeImageOptions = {}
): Promise<{ buffer: Buffer; mime: "image/jpeg" }> {
  const maxEdge = options.maxEdge ?? 400;
  const maxStored = options.maxStoredBytes ?? MAX_STORED_IMAGE_BYTES;
  let quality = options.quality ?? 80;

  const sharp = (await import("sharp")).default;

  let edge = maxEdge;
  for (let attempt = 0; attempt < 6; attempt++) {
    const buffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: edge,
        height: edge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (buffer.byteLength <= maxStored) {
      return { buffer, mime: "image/jpeg" };
    }
    quality = Math.max(40, quality - 12);
    edge = Math.max(160, Math.round(edge * 0.85));
  }

  throw new Error("TOO_LARGE");
}

/**
 * Convert an uploaded File into a compact JPEG data URL for DB storage.
 */
export async function fileToOptimizedImageDataUrl(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<string> {
  if (!areImageUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  if (file.size <= 0) throw new Error("NO_FILE");
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error("TOO_LARGE");

  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_IMAGE_TYPES.has(type)) {
    throw new Error("INVALID_TYPE");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const { buffer, mime } = await optimizeImageBuffer(input, options);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Prefer Vercel Blob when configured; otherwise store optimized JPEG data URL.
 * Returns a value safe for `photoUrl` / `logoUrl` columns (https URL or data:).
 */
export async function fileToOptimizedImageStorage(
  file: File,
  pathPrefix: string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  if (!areImageUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  if (file.size <= 0) throw new Error("NO_FILE");
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error("TOO_LARGE");

  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_IMAGE_TYPES.has(type)) {
    throw new Error("INVALID_TYPE");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const { buffer, mime } = await optimizeImageBuffer(input, options);

  const { isObjectStorageEnabled, putObject, storagePath } = await import(
    "@/lib/object-storage"
  );
  if (isObjectStorageEnabled()) {
    const key = storagePath([pathPrefix, "image.jpg"]);
    const put = await putObject(key, buffer, mime);
    return put.url;
  }

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Legacy path: store as-is (no resize). Prefer fileToOptimizedImageDataUrl.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!areImageUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_STORED_IMAGE_BYTES) {
    throw new Error("TOO_LARGE");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("INVALID_TYPE");
  }
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
