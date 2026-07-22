import { describe, expect, it } from "vitest";
import { diffAgendaItemOperations } from "@/lib/minute-agenda-item-sync";

describe("diffAgendaItemOperations", () => {
  it("keeps existing ids, creates new items, and deletes removed ones", () => {
    const existing = [
      { id: "keep", sortOrder: 0 },
      { id: "remove", sortOrder: 1 },
    ];

    const incoming = [
      {
        id: "keep",
        title: "Keep",
        description: "",
        decisions: "",
        actions: "",
        responsible: "",
        dueDate: null,
        status: "OPEN",
      },
      {
        id: "new",
        title: "New",
        description: "",
        decisions: "",
        actions: "",
        responsible: "",
        dueDate: null,
        status: "OPEN",
      },
    ];

    const result = diffAgendaItemOperations(existing, incoming);

    expect(result.keepIds).toEqual(["keep"]);
    expect(result.createItems).toHaveLength(1);
    expect(result.createItems[0]?.id).toBe("new");
    expect(result.deleteIds).toEqual(["remove"]);
  });
});
