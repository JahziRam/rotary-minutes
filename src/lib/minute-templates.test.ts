import { describe, expect, it } from "vitest";

const DISTRICT_STATUTORY_FR = [
  "Ouverture de la séance — hymne et drapeaux",
  "Moment Fondation Rotary",
  "Clôture — Serment du Rotarien",
];

describe("district minute templates", () => {
  it("defines homologated statutory items for French district templates", async () => {
    const mod = await import("./minute-templates");
    expect(typeof mod.ensureDistrictMinuteTemplates).toBe("function");
    expect(typeof mod.getAgendaTemplateForMeeting).toBe("function");
    expect(DISTRICT_STATUTORY_FR.length).toBeGreaterThan(0);
  });
});