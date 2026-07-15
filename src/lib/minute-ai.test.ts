import { describe, expect, it } from "vitest";
import { parsePolishedResponse } from "@/lib/minute-ai";

describe("minute-ai", () => {
  it("parses JSON polish response", () => {
    const parsed = parsePolishedResponse(
      JSON.stringify({
        description: "Le club a approuvé le budget.",
        decisions: "Budget 2026 adopté à l'unanimité.",
        actions: "Envoyer le document au district.",
        responsible: "Marie Dupont",
        dueDate: "2026-03-15",
      })
    );

    expect(parsed).toEqual({
      description: "Le club a approuvé le budget.",
      decisions: "Budget 2026 adopté à l'unanimité.",
      actions: "Envoyer le document au district.",
      responsible: "Marie Dupont",
      dueDate: "2026-03-15",
    });
  });

  it("rejects invalid due dates", () => {
    const parsed = parsePolishedResponse(
      JSON.stringify({
        description: "Compte-rendu.",
        decisions: "",
        actions: "",
        responsible: "",
        dueDate: "15/03/2026",
      })
    );

    expect(parsed?.dueDate).toBeNull();
  });
});