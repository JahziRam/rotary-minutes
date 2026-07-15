import { describe, expect, it } from "vitest";
import {
  buildMemberDuplicateIndex,
  isDuplicateInMemberIndex,
  memberNameKey,
  normalizeMemberEmail,
  trackMemberInDuplicateIndex,
} from "@/lib/member-dedup";

describe("member-dedup", () => {
  it("detects duplicate email regardless of case", () => {
    const existing = buildMemberDuplicateIndex([
      {
        email: "Jean@Example.com",
        registrationNumber: null,
        firstName: "Jean",
        lastName: "Dupont",
      },
    ]);
    const batch = buildMemberDuplicateIndex([]);

    expect(
      isDuplicateInMemberIndex(existing, batch, {
        email: "jean@example.com",
        registrationNumber: null,
        firstName: "Other",
        lastName: "Name",
      })
    ).toBe(true);
  });

  it("detects duplicate registration number", () => {
    const existing = buildMemberDuplicateIndex([
      {
        email: null,
        registrationNumber: "RI-123",
        firstName: "Jean",
        lastName: "Dupont",
      },
    ]);
    const batch = buildMemberDuplicateIndex([]);

    expect(
      isDuplicateInMemberIndex(existing, batch, {
        email: null,
        registrationNumber: "RI-123",
        firstName: "Marie",
        lastName: "Martin",
      })
    ).toBe(true);
  });

  it("detects duplicate name when email is missing", () => {
    const existing = buildMemberDuplicateIndex([
      {
        email: null,
        registrationNumber: null,
        firstName: "Jean",
        lastName: "Dupont",
      },
    ]);
    const batch = buildMemberDuplicateIndex([]);

    expect(
      isDuplicateInMemberIndex(existing, batch, {
        email: null,
        registrationNumber: null,
        firstName: "JEAN",
        lastName: "dupont",
      })
    ).toBe(true);
  });

  it("tracks imported rows to avoid duplicates within the same batch", () => {
    const existing = buildMemberDuplicateIndex([]);
    const batch = buildMemberDuplicateIndex([]);
    const row = {
      email: "new@example.com",
      registrationNumber: null,
      firstName: "Alice",
      lastName: "Martin",
    };

    expect(isDuplicateInMemberIndex(existing, batch, row)).toBe(false);
    trackMemberInDuplicateIndex(batch, row);
    expect(isDuplicateInMemberIndex(existing, batch, row)).toBe(true);
  });

  it("normalizes email and name keys", () => {
    expect(normalizeMemberEmail("  Test@Mail.COM ")).toBe("test@mail.com");
    expect(memberNameKey(" Jean ", " Dupont ")).toBe("jean|dupont");
  });
});