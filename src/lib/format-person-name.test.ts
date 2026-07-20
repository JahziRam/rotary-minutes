import { describe, expect, it } from "vitest";
import {
  formatFirstName,
  formatGuestName,
  formatLastName,
  formatPersonName,
  formatPersonNameParts,
} from "./format-person-name";

describe("format-person-name", () => {
  it("formats last names in uppercase", () => {
    expect(formatLastName("dupont")).toBe("DUPONT");
    expect(formatLastName("De La Fontaine")).toBe("DE LA FONTAINE");
  });

  it("capitalizes each first-name part", () => {
    expect(formatFirstName("jean")).toBe("Jean");
    expect(formatFirstName("JEAN-PIERRE")).toBe("Jean-Pierre");
    expect(formatFirstName("marie claire")).toBe("Marie Claire");
    expect(formatFirstName("  jEaN  ")).toBe("Jean");
  });

  it("displays as Prénom NOM", () => {
    expect(formatPersonName("jean", "dupont")).toBe("Jean DUPONT");
    expect(formatPersonName("marie-claire", "martin")).toBe("Marie-Claire MARTIN");
  });

  it("formats guest free-text with last token as nom", () => {
    expect(formatGuestName("jean dupont")).toBe("Jean DUPONT");
    expect(formatGuestName("Marie Claire Martin")).toBe("Marie Claire MARTIN");
    expect(formatGuestName("Sophie")).toBe("Sophie");
  });

  it("returns normalized parts for storage", () => {
    expect(formatPersonNameParts("jEaN-piErRe", "dupont")).toEqual({
      firstName: "Jean-Pierre",
      lastName: "DUPONT",
    });
  });
});
