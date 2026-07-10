export type DocumentViewKind = "pdf" | "image" | "office" | "text" | "unsupported";

const OFFICE_PREVIEW_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export function normalizeDocumentMime(mime: string | null | undefined): string {
  if (!mime) return "";
  const lower = mime.toLowerCase().trim();
  return MIME_ALIASES[lower] ?? lower;
}

export function isOfficePreviewMime(mime: string | null | undefined): boolean {
  return OFFICE_PREVIEW_MIMES.has(normalizeDocumentMime(mime));
}

export function getDocumentViewKind(
  mimeType: string | null | undefined,
  fileUrl?: string | null
): DocumentViewKind {
  const mime = normalizeDocumentMime(mimeType);
  if (mime === "application/pdf" || fileUrl?.includes("/api/pdf/")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (isOfficePreviewMime(mime)) return "office";
  if (mime === "text/plain") return "text";
  return "unsupported";
}