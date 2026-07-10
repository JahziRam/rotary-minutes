import { getDocumentViewKind } from "@/lib/document-types";

export function treasuryVoucherViewUrl(
  voucherId: string,
  mimeType?: string | null
): string {
  const kind = getDocumentViewKind(mimeType, null);
  if (kind === "office" || kind === "text") {
    return `/api/treasury/vouchers/${voucherId}?preview=1`;
  }
  return `/api/treasury/vouchers/${voucherId}`;
}

export function treasuryVoucherDownloadUrl(voucherId: string): string {
  return `/api/treasury/vouchers/${voucherId}?download=1`;
}