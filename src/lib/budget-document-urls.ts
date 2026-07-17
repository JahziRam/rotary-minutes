import { getDocumentViewKind } from "@/lib/document-types";

export function budgetDocumentViewUrl(
  documentId: string,
  mimeType?: string | null
): string {
  const kind = getDocumentViewKind(mimeType, null);
  if (kind === "office" || kind === "text") {
    return `/api/budget/documents/${documentId}?preview=1`;
  }
  return `/api/budget/documents/${documentId}`;
}

export function budgetDocumentDownloadUrl(documentId: string): string {
  return `/api/budget/documents/${documentId}?download=1`;
}
