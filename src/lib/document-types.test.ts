import { describe, expect, it } from "vitest";
import { getDocumentViewKind, normalizeDocumentMime } from "./document-types";
import { documentViewUrl } from "./document-urls";

describe("document-types", () => {
  it("normalizes image mime aliases", () => {
    expect(normalizeDocumentMime("image/jpg")).toBe("image/jpeg");
    expect(normalizeDocumentMime("image/pjpeg")).toBe("image/jpeg");
  });

  it("detects view kinds", () => {
    expect(getDocumentViewKind("image/png")).toBe("image");
    expect(getDocumentViewKind("application/pdf")).toBe("pdf");
    expect(
      getDocumentViewKind(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe("office");
    expect(getDocumentViewKind("application/msword")).toBe("unsupported");
  });

  it("routes office files to preview endpoint", () => {
    expect(
      documentViewUrl(
        "doc1",
        "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,x",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("/api/documents/doc1?preview=1");
    expect(
      documentViewUrl("doc1", "data:image/png;base64,x", "image/png")
    ).toBe("/api/documents/doc1");
  });
});