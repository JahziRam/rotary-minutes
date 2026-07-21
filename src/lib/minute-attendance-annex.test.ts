import { describe, expect, it } from "vitest";
import {
  annexColumnCount,
  birthdayOccurrenceInWeek,
  collectWeekBirthdays,
  meetingWeekRange,
  splitIntoColumns,
} from "./minute-attendance-annex";

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

describe("week birthdays", () => {
  it("uses Monday–Sunday week around the meeting", () => {
    // Wednesday 4 March 2026
    const { start, end } = meetingWeekRange(new Date(2026, 2, 4));
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(start.getDate()).toBe(2);
    expect(end.getDate()).toBe(8);
  });

  it("matches birthdays that fall in the meeting week", () => {
    const week = meetingWeekRange(new Date(2026, 2, 4)); // Mon 2 – Sun 8 Mar
    const inWeek = birthdayOccurrenceInWeek(new Date(1990, 2, 5), week.start, week.end);
    const outWeek = birthdayOccurrenceInWeek(new Date(1990, 2, 15), week.start, week.end);
    expect(inWeek?.getFullYear()).toBe(2026);
    expect(inWeek?.getDate()).toBe(5);
    expect(outWeek).toBeNull();
  });

  it("collects member and spouse birthdays for the week", () => {
    const meetingDate = new Date(2026, 2, 4); // week 2–8 March
    const entries = collectWeekBirthdays(
      [
        {
          id: "m1",
          firstName: "Jean",
          lastName: "Dupont",
          birthday: new Date(1980, 2, 3), // 3 Mar
          spouseFirstName: "Marie",
          spouseLastName: "Dupont",
          spouseBirthday: new Date(1982, 2, 7), // 7 Mar
        },
        {
          id: "m2",
          firstName: "Paul",
          lastName: "Martin",
          birthday: new Date(1975, 5, 1), // June — out
        },
      ],
      meetingDate,
      "fr"
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].kind).toBe("member");
    expect(entries[0].name).toContain("Jean");
    expect(entries[1].kind).toBe("spouse");
    expect(entries[1].name).toContain("Marie");
    expect(entries[1].kindLabel).toMatch(/Conjoint de/);
  });
});
