import { describe, expect, it } from "vitest";
import {
  documentDownloadUrl,
  documentViewUrl,
  isStoredDataUrl,
} from "./document-urls";

describe("document-urls", () => {
  it("detects stored data urls", () => {
    expect(isStoredDataUrl("data:application/pdf;base64,abc")).toBe(true);
    expect(isStoredDataUrl("/api/pdf/abc")).toBe(false);
  });

  it("maps data urls to document api routes", () => {
    expect(
      documentViewUrl("doc1", "data:application/pdf;base64,x", "application/pdf")
    ).toBe("/api/documents/doc1");
    expect(documentDownloadUrl("doc1", "data:application/pdf;base64,x")).toBe(
      "/api/documents/doc1?download=1"
    );
  });

  it("adds inline/download params for minute pdf routes", () => {
    expect(documentViewUrl("doc1", "/api/pdf/min1")).toBe("/api/pdf/min1?inline=1");
    expect(documentDownloadUrl("doc1", "/api/pdf/min1")).toBe(
      "/api/pdf/min1?download=1"
    );
  });
});