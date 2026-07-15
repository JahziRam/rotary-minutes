import { describe, expect, it } from "vitest";
import {
  buildClubDefaultLogoDataUrl,
  buildClubDefaultLogoSvg,
  escapeSvgText,
  getClubDefaultLogoDimensions,
  getRotaryWordmarkDataUrl,
  layoutClubNameLines,
  parseClubDisplayName,
} from "@/lib/club-default-logo";
import { ROTARY_BRAND } from "@/lib/rotary-brand";

describe("club-default-logo", () => {
  it("échappe les caractères XML", () => {
    expect(escapeSvgText(`Club "A" & B`)).toBe("Club &quot;A&quot; &amp; B");
  });

  it("extrait le sous-titre club (sans le mot Rotary)", () => {
    expect(parseClubDisplayName("Rotary Club de Marseille Provence")).toBe(
      "Club de Marseille Provence"
    );
  });

  it("expose le wordmark Rotary en data URL", () => {
    expect(getRotaryWordmarkDataUrl()).toMatch(/^data:image\/png;base64,/);
  });

  it("génère un SVG avec image wordmark + nom du club en dessous", () => {
    const svg = buildClubDefaultLogoSvg("Rotary Club de Marseille Provence");
    const dims = getClubDefaultLogoDimensions("Rotary Club de Marseille Provence");

    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).toContain(">Club de Marseille</tspan>");
    expect(svg).toContain(">Provence</tspan>");
    expect(svg).toContain(ROTARY_BRAND.royalBlue);
    expect(svg).toContain(`width="${dims.width}"`);
    expect(svg.indexOf("<image")).toBeLessThan(
      svg.indexOf(">Club de Marseille</tspan>")
    );
  });

  it("produit une data URL SVG encodée", () => {
    const url = buildClubDefaultLogoDataUrl("Rotary Club Test");
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("découpe un sous-titre long sur deux lignes", () => {
    const lines = layoutClubNameLines(
      "Rotary Club de la Vallée de Montmorency"
    );
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});