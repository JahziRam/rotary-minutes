export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function validateDocumentDataUrl(dataUrl: string): string | null {
  if (!isDataUrl(dataUrl)) return "INVALID_FORMAT";
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return "INVALID_FORMAT";
  const mime = match[1].toLowerCase();
  if (!ALLOWED_DOCUMENT_TYPES.has(mime)) return "INVALID_TYPE";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) return "TOO_LARGE";
  return null;
}

export async function fileToDocumentDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("TOO_LARGE");
  }
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("INVALID_TYPE");
  }
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}