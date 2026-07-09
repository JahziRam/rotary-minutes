import { describe, it, expect } from "vitest";
import {
  buildAutoMinuteFreeText,
  enrichAgendaFromMeeting,
} from "@/lib/minute-auto-generate";

describe("minute-auto-generate", () => {
  const meeting = {
    date: new Date("2026-03-04"),
    location: "Hôtel Lutetia",
    type: "STATUTORY",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendances: [
      { category: "PRESENT", member: { firstName: "Paul", lastName: "A" } },
      { category: "EXCUSED_ABSENT", member: { firstName: "Luc", lastName: "B" } },
      { category: "VISITOR", guestName: "Invité Rotary" },
    ],
  };

  it("builds free text with attendance summary", () => {
    const text = buildAutoMinuteFreeText(meeting, "fr");
    expect(text).toContain("Présidence");
    expect(text).toContain("annexe");
    expect(text).toContain("Visiteurs");
  });

  it("enriches attendance agenda item", () => {
    const items = enrichAgendaFromMeeting(
      [{ id: "1", title: "Présences et assiduité", decisions: null }],
      meeting,
      "fr"
    );
    expect(items[0].decisions).toContain("Paul");
  });
});