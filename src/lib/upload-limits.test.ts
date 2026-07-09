import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES_PER_BATCH,
  validateUploadFileCount,
  validateUploadFileSize,
  validateUploadFiles,
} from "@/lib/upload-limits";

describe("upload-limits", () => {
  it("allows files up to 5 MB", () => {
    expect(validateUploadFileSize(MAX_UPLOAD_FILE_BYTES)).toBeNull();
    expect(validateUploadFileSize(MAX_UPLOAD_FILE_BYTES + 1)).toBe("TOO_LARGE");
  });

  it("allows up to 10 files per batch", () => {
    expect(validateUploadFileCount(MAX_UPLOAD_FILES_PER_BATCH)).toBeNull();
    expect(validateUploadFileCount(MAX_UPLOAD_FILES_PER_BATCH + 1)).toBe(
      "TOO_MANY_FILES"
    );
  });

  it("validates a batch of files", () => {
    const files = Array.from({ length: 3 }, (_, i) => ({
      size: 1024,
      name: `f${i}.pdf`,
    })) as File[];
    expect(validateUploadFiles(files)).toBeNull();
  });
});