export const MAX_IMAGE_BYTES = 512 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:image/");
}

export function validateImageDataUrl(dataUrl: string): string | null {
  if (!isDataUrl(dataUrl)) return "INVALID_FORMAT";
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return "INVALID_FORMAT";
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) return "INVALID_TYPE";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) return "TOO_LARGE";
  return null;
}

export function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("TOO_LARGE");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("INVALID_TYPE");
  }
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}