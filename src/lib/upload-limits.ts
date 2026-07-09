/** Max size per uploaded file (5 MB). */
export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;

/** Max files per upload batch. */
export const MAX_UPLOAD_FILES_PER_BATCH = 10;

export type UploadValidationError = "NO_FILE" | "TOO_LARGE" | "TOO_MANY_FILES";

export function validateUploadFileSize(size: number): UploadValidationError | null {
  if (size <= 0) return "NO_FILE";
  if (size > MAX_UPLOAD_FILE_BYTES) return "TOO_LARGE";
  return null;
}

export function validateUploadFileCount(count: number): UploadValidationError | null {
  if (count <= 0) return "NO_FILE";
  if (count > MAX_UPLOAD_FILES_PER_BATCH) return "TOO_MANY_FILES";
  return null;
}

export function validateUploadFiles(files: File[]): UploadValidationError | null {
  const countError = validateUploadFileCount(files.length);
  if (countError) return countError;
  for (const file of files) {
    const sizeError = validateUploadFileSize(file.size);
    if (sizeError) return sizeError;
  }
  return null;
}

export function validateTextUploadSize(text: string): UploadValidationError | null {
  const bytes = new TextEncoder().encode(text).byteLength;
  return validateUploadFileSize(bytes);
}

export function formatMaxUploadSize(locale: string): string {
  return locale === "fr" ? "5 Mo" : "5 MB";
}