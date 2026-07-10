/** Client-safe URLs for viewing/downloading club documents (never expose data: blobs). */

export function isStoredDataUrl(fileUrl: string | null | undefined): boolean {
  return !!fileUrl?.startsWith("data:");
}

function pdfPathWithParams(fileUrl: string, download: boolean): string {
  const [path, query = ""] = fileUrl.split("?");
  const params = new URLSearchParams(query);
  if (download) {
    params.set("download", "1");
    params.delete("inline");
  } else {
    params.set("inline", "1");
    params.delete("download");
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** URL for inline preview (iframe, new tab read). */
export function documentViewUrl(
  documentId: string,
  fileUrl: string | null | undefined
): string | null {
  if (!fileUrl) return null;
  if (isStoredDataUrl(fileUrl)) return `/api/documents/${documentId}`;
  if (fileUrl.includes("/api/pdf/")) return pdfPathWithParams(fileUrl, false);
  return fileUrl;
}

/** URL that prompts download when possible. */
export function documentDownloadUrl(
  documentId: string,
  fileUrl: string | null | undefined
): string | null {
  if (!fileUrl) return null;
  if (isStoredDataUrl(fileUrl)) return `/api/documents/${documentId}?download=1`;
  if (fileUrl.includes("/api/pdf/")) return pdfPathWithParams(fileUrl, true);
  return fileUrl;
}