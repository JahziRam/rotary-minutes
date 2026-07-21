/** Club option: member profile photo size in PV annex (preview + PDF). */

export const MINUTE_MEMBER_PHOTO_SIZES = ["S", "M", "L"] as const;

export type MinuteMemberPhotoSize = (typeof MINUTE_MEMBER_PHOTO_SIZES)[number];

export const DEFAULT_MINUTE_MEMBER_PHOTO_SIZE: MinuteMemberPhotoSize = "S";

type SizeSpec = {
  /** Diameter in PDF points (react-pdf). */
  pdfPt: number;
  /** Diameter in CSS pixels (web preview). */
  previewPx: number;
  /** Tailwind ring / spacing helpers for preview. */
  previewClass: string;
};

export const MINUTE_MEMBER_PHOTO_SIZE_SPECS: Record<MinuteMemberPhotoSize, SizeSpec> = {
  S: { pdfPt: 12, previewPx: 20, previewClass: "h-5 w-5" },
  M: { pdfPt: 18, previewPx: 28, previewClass: "h-7 w-7" },
  L: { pdfPt: 26, previewPx: 36, previewClass: "h-9 w-9" },
};

export function parseMinuteMemberPhotoSize(
  value: string | null | undefined
): MinuteMemberPhotoSize {
  if (value === "S" || value === "M" || value === "L") return value;
  return DEFAULT_MINUTE_MEMBER_PHOTO_SIZE;
}

export function minuteMemberPhotoPdfStyle(size: MinuteMemberPhotoSize) {
  const pt = MINUTE_MEMBER_PHOTO_SIZE_SPECS[size].pdfPt;
  return {
    width: pt,
    height: pt,
    borderRadius: pt / 2,
  };
}

export function minuteMemberPhotoPreviewStyle(size: MinuteMemberPhotoSize) {
  const px = MINUTE_MEMBER_PHOTO_SIZE_SPECS[size].previewPx;
  return {
    width: px,
    height: px,
  };
}

/**
 * Adaptive annex columns: larger photos need fewer columns.
 * withPhotos=false ignores size.
 */
export function annexColumnCountForPhotos(
  itemCount: number,
  withPhotos: boolean,
  photoSize: MinuteMemberPhotoSize = DEFAULT_MINUTE_MEMBER_PHOTO_SIZE
): number {
  if (!withPhotos) {
    if (itemCount <= 8) return 1;
    if (itemCount <= 24) return 2;
    return 3;
  }
  if (photoSize === "L") {
    if (itemCount <= 8) return 1;
    if (itemCount <= 20) return 2;
    return 3;
  }
  if (photoSize === "M") {
    if (itemCount <= 9) return 1;
    if (itemCount <= 24) return 2;
    return 3;
  }
  // S
  if (itemCount <= 10) return 1;
  if (itemCount <= 28) return 2;
  return 3;
}
