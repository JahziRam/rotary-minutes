import { MAX_UPLOAD_FILE_BYTES } from "@/lib/upload-limits";
import { normalizeDocumentMime } from "@/lib/document-types";
import { areUploadsEnabled } from "@/lib/image-storage";

export const MAX_DOCUMENT_BYTES = MAX_UPLOAD_FILE_BYTES;

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

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
};

export function resolveFileMimeType(file: Pick<File, "type" | "name">): string {
  const normalized = normalizeDocumentMime(file.type);
  if (normalized && ALLOWED_DOCUMENT_TYPES.has(normalized)) {
    return normalized;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  return normalized || file.type;
}

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function validateDocumentDataUrl(dataUrl: string): string | null {
  if (!isDataUrl(dataUrl)) return "INVALID_FORMAT";
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return "INVALID_FORMAT";
  const mime = normalizeDocumentMime(match[1]);
  if (!ALLOWED_DOCUMENT_TYPES.has(mime)) return "INVALID_TYPE";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) return "TOO_LARGE";
  return null;
}

export function bufferToDocumentDataUrl(
  buffer: Buffer,
  fileName: string,
  mimeTypeInput?: string
): { dataUrl: string; mimeType: string } {
  if (!areUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("TOO_LARGE");
  }
  const mimeType = resolveFileMimeType({
    type: mimeTypeInput ?? "",
    name: fileName,
  });
  if (!ALLOWED_DOCUMENT_TYPES.has(mimeType)) {
    throw new Error("INVALID_TYPE");
  }
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    mimeType,
  };
}

export async function fileToDocumentDataUrl(file: File): Promise<{
  dataUrl: string;
  mimeType: string;
}> {
  if (!areUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return bufferToDocumentDataUrl(buffer, file.name, file.type);
}