import { describe, expect, it } from "vitest";
import {
  buildClubDefaultLogoDataUrl,
  buildClubDefaultLogoSvg,
  CLUB_DEFAULT_LOGO,
  escapeSvgText,
  estimateClubNameTextWidth,
  getClubDefaultLogoDimensions,
  getClubNameTopY,
  getRotaryWordmarkDataUrl,
  layoutClubNameLines,
  parseClubDisplayName,
  resolveClubNameLayout,
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

  it("génère un SVG avec image wordmark + nom du club sur une ligne", () => {
    const clubName = "Rotary Club de Marseille Provence";
    const svg = buildClubDefaultLogoSvg(clubName);
    const dims = getClubDefaultLogoDimensions(clubName);
    const layout = resolveClubNameLayout(clubName, 48);

    expect(layout.lines).toEqual(["Club de Marseille Provence"]);
    expect(layout.fontSize).toBe(12);
    expect(layout.offsetX).toBeGreaterThan(0);
    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).toContain('font-size="12"');
    expect(svg).toContain(">Club de Marseille Provence</tspan>");
    expect(svg).toContain(ROTARY_BRAND.royalBlue);
    expect(svg).toContain('text-anchor="end"');
    expect(svg).not.toContain("clip-path");
    expect(dims.width).toBeGreaterThan(120);
    expect(svg.indexOf("<image")).toBeLessThan(
      svg.indexOf(">Club de Marseille Provence</tspan>")
    );

    const rotaryBottom =
      CLUB_DEFAULT_LOGO.wordmarkHeight * CLUB_DEFAULT_LOGO.rotaryTextBottomRatio;
    const nameTop = getClubNameTopY(CLUB_DEFAULT_LOGO.wordmarkHeight, layout.fontSize);
    expect(nameTop - rotaryBottom).toBeCloseTo(CLUB_DEFAULT_LOGO.clubNameVerticalGap, 1);
  });

  it("produit une data URL SVG encodée", () => {
    const url = buildClubDefaultLogoDataUrl("Rotary Club Test");
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("affiche un sous-titre long sur une seule ligne sans tronquer", () => {
    const long = "Rotary Club de la Vallée de Montmorency et des Environs";
    const display = parseClubDisplayName(long);
    const lines = layoutClubNameLines(long);
    const layout = resolveClubNameLayout(long, 48);
    const dims = getClubDefaultLogoDimensions(long);

    expect(lines).toEqual(["Club de la Vallée de Montmorency et des Environs"]);
    expect(lines.length).toBe(1);
    expect(dims.width).toBeGreaterThanOrEqual(
      estimateClubNameTextWidth(display, layout.fontSize) + 4
    );
  });
});