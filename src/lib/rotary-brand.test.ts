import { describe, expect, it } from "vitest";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

describe("rotary-brand", () => {
  it("exposes official Rotary International palette", () => {
    expect(ROTARY_BRAND.royalBlue).toBe("#17458B");
    expect(ROTARY_BRAND.gold).toBe("#F7A81B");
  });

  it("defines logo clear space for documents", () => {
    expect(ROTARY_LOGO_DISPLAY.clearSpacePx).toBeGreaterThanOrEqual(12);
    expect(ROTARY_LOGO_DISPLAY.maxWidthPx).toBeGreaterThan(ROTARY_LOGO_DISPLAY.maxHeightPx);
  });
});