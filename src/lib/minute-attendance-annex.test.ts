import { describe, expect, it } from "vitest";
import { annexColumnCount, splitIntoColumns } from "./minute-attendance-annex";

describe("annex columns", () => {
  it("picks adaptive column counts", () => {
    expect(annexColumnCount(3)).toBe(1);
    expect(annexColumnCount(8)).toBe(1);
    expect(annexColumnCount(9)).toBe(2);
    expect(annexColumnCount(24)).toBe(2);
    expect(annexColumnCount(25)).toBe(3);
  });

  it("uses fewer columns for larger photos", () => {
    expect(annexColumnCount(10, true, "S")).toBe(1);
    expect(annexColumnCount(11, true, "S")).toBe(2);
    expect(annexColumnCount(9, true, "M")).toBe(1);
    expect(annexColumnCount(10, true, "M")).toBe(2);
    expect(annexColumnCount(8, true, "L")).toBe(1);
    expect(annexColumnCount(9, true, "L")).toBe(2);
  });

  it("fills columns top-to-bottom then left-to-right", () => {
    const names = ["A", "B", "C", "D", "E"];
    expect(splitIntoColumns(names, 2)).toEqual([
      ["A", "B", "C"],
      ["D", "E"],
    ]);
    expect(splitIntoColumns(names, 3)).toEqual([["A", "B"], ["C", "D"], ["E"]]);
  });

  it("handles empty lists", () => {
    expect(splitIntoColumns([], 2)).toEqual([[]]);
  });
});
