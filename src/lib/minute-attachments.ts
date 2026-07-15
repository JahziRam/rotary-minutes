import type { DocumentCategory } from "@/generated/prisma/client";

export const MINUTE_ATTACHMENT_TAG = "minute-attachment";

export function isMinuteUserAttachment(doc: {
  minuteId: string | null;
  tags: string[];
}): boolean {
  return !!doc.minuteId && doc.tags.includes(MINUTE_ATTACHMENT_TAG);
}

export function isMinuteArchivePdfLink(doc: {
  category: DocumentCategory;
  fileUrl: string | null;
  tags: string[];
}): boolean {
  return (
    !!doc.fileUrl?.includes("/api/pdf/") &&
    doc.category === "MINUTE" &&
    !doc.tags.includes(MINUTE_ATTACHMENT_TAG)
  );
}

export function decodeStoredDocumentBuffer(fileUrl: string): Buffer | null {
  const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base || fileName;
}