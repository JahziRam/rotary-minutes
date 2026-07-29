import { describe, expect, it } from "vitest";
import {
  ALLOWED_DOCUMENT_TYPES,
  isAllowedDocumentFile,
  resolveFileMimeType,
  validateDocumentUploadFiles,
} from "@/lib/document-storage";
import { MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILES_PER_BATCH } from "@/lib/upload-limits";

function fakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("document-storage allowed types", () => {
  it("allows PDF, Office and TXT only", () => {
    expect(isAllowedDocumentFile({ name: "a.pdf", type: "application/pdf" })).toBe(
      true
    );
    expect(
      isAllowedDocumentFile({
        name: "a.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toBe(true);
    expect(isAllowedDocumentFile({ name: "a.txt", type: "text/plain" })).toBe(true);
    expect(isAllowedDocumentFile({ name: "a.pptx", type: "" })).toBe(true);
    expect(isAllowedDocumentFile({ name: "photo.png", type: "image/png" })).toBe(
      false
    );
    expect(isAllowedDocumentFile({ name: "x.jpg", type: "image/jpeg" })).toBe(false);
    expect(ALLOWED_DOCUMENT_TYPES.has("image/png")).toBe(false);
  });

  it("resolves mime from extension when browser type is empty", () => {
    expect(resolveFileMimeType({ name: "report.PDF", type: "" })).toBe(
      "application/pdf"
    );
    expect(resolveFileMimeType({ name: "sheet.xlsx", type: "" })).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("enforces 5 files max and 5 MB", () => {
    expect(MAX_UPLOAD_FILES_PER_BATCH).toBe(5);
    const ok = Array.from({ length: 5 }, (_, i) =>
      fakeFile(`f${i}.pdf`, "application/pdf", 1024)
    );
    expect(validateDocumentUploadFiles(ok)).toBeNull();

    const tooMany = Array.from({ length: 6 }, (_, i) =>
      fakeFile(`f${i}.pdf`, "application/pdf", 1024)
    );
    expect(validateDocumentUploadFiles(tooMany)).toBe("TOO_MANY_FILES");

    expect(
      validateDocumentUploadFiles([
        fakeFile("big.pdf", "application/pdf", MAX_UPLOAD_FILE_BYTES + 1),
      ])
    ).toBe("TOO_LARGE");

    expect(
      validateDocumentUploadFiles([fakeFile("x.png", "image/png", 100)])
    ).toBe("INVALID_TYPE");
  });
});
