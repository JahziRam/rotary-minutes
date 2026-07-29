import {
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES_PER_BATCH,
  type UploadValidationError,
  validateUploadFileCount,
  validateUploadFileSize,
} from "@/lib/upload-limits";
import { normalizeDocumentMime } from "@/lib/document-types";

export const MAX_DOCUMENT_BYTES = MAX_UPLOAD_FILE_BYTES;
export const MAX_DOCUMENT_FILES_PER_BATCH = MAX_UPLOAD_FILES_PER_BATCH;

/**
 * Document / attachment uploads (library, PV, treasury, budget).
 * Enabled by default — set UPLOADS_ENABLED=false or DOCUMENT_UPLOADS_ENABLED=false to suspend.
 */
export function areDocumentUploadsEnabled(): boolean {
  if (process.env.DOCUMENT_UPLOADS_ENABLED === "false") return false;
  if (process.env.UPLOADS_ENABLED === "false") return false;
  return true;
}

/** @deprecated use areDocumentUploadsEnabled — kept for call sites that imported image-storage */
export function areUploadsEnabled(): boolean {
  return areDocumentUploadsEnabled();
}

/** PDF, Microsoft Office, plain text only (no images). */
export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};

/** For HTML file inputs: Office + PDF + TXT only. */
export const DOCUMENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain";

export function resolveFileMimeType(file: Pick<File, "type" | "name">): string {
  const normalized = normalizeDocumentMime(file.type);
  if (normalized && ALLOWED_DOCUMENT_TYPES.has(normalized)) {
    return normalized;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  return normalized || file.type || "";
}

export function isAllowedDocumentFile(file: Pick<File, "type" | "name">): boolean {
  const mime = resolveFileMimeType(file);
  return ALLOWED_DOCUMENT_TYPES.has(mime);
}

/**
 * Validate a batch for document sharing: count ≤ 5, size ≤ 5 MB, allowed types only.
 */
export function validateDocumentUploadFiles(
  files: File[]
): UploadValidationError | null {
  const countError = validateUploadFileCount(files.length);
  if (countError) return countError;
  for (const file of files) {
    const sizeError = validateUploadFileSize(file.size);
    if (sizeError) return sizeError;
    if (!isAllowedDocumentFile(file)) return "INVALID_TYPE";
  }
  return null;
}

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function validateDocumentDataUrl(dataUrl: string): string | null {
  // Vercel Blob / external HTTPS URLs stored in fileUrl
  if (/^https?:\/\//i.test(dataUrl)) return null;
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
  if (!areDocumentUploadsEnabled()) {
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
  if (!areDocumentUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("TOO_LARGE");
  }
  if (!isAllowedDocumentFile(file)) {
    throw new Error("INVALID_TYPE");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return bufferToDocumentDataUrl(buffer, file.name, file.type);
}

/**
 * Prefer Vercel Blob when configured; otherwise data URL in DB.
 * `dataUrl` field name kept for callers — may be an https:// blob URL.
 */
export async function fileToDocumentStorage(
  file: File,
  pathPrefix: string
): Promise<{ dataUrl: string; mimeType: string }> {
  if (!areDocumentUploadsEnabled()) {
    throw new Error("UPLOADS_SUSPENDED");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("TOO_LARGE");
  }
  if (!isAllowedDocumentFile(file)) {
    throw new Error("INVALID_TYPE");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveFileMimeType({ type: file.type, name: file.name });
  if (!ALLOWED_DOCUMENT_TYPES.has(mimeType)) {
    throw new Error("INVALID_TYPE");
  }

  const { isObjectStorageEnabled, putObject, storagePath } = await import(
    "@/lib/object-storage"
  );
  if (isObjectStorageEnabled()) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = storagePath([pathPrefix, `file.${ext}`]);
    const put = await putObject(key, buffer, mimeType);
    return { dataUrl: put.url, mimeType };
  }

  return bufferToDocumentDataUrl(buffer, file.name, file.type);
}
