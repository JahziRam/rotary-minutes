import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ClubContext } from "@/lib/club-context";
import type { ClubRoleType } from "@/lib/rotary";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { minuteWhereForContext } from "./commission-scope";

function makeCtx(role: ClubRoleType, overrides: Partial<ClubContext> = {}): ClubContext {
  return {
    userId: "user-1",
    isSuperAdmin: false,
    role,
    customRoleId: null,
    clubId: "club-1",
    clubName: "Test Club",
    club: {} as ClubContext["club"],
    features: {} as ClubContext["features"],
    ...overrides,
  };
}

describe("minuteWhereForContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns club scope only for non-commission-chair roles", async () => {
    for (const role of ["ADMIN", "SECRETARY", "PRESIDENT"] as const) {
      const scope = await minuteWhereForContext(makeCtx(role));
      expect(scope).toEqual({ clubId: "club-1" });
    }
    expect(prismaMock.member.findFirst).not.toHaveBeenCalled();
  });

  it("returns club scope for super admin even with COMMISSION_CHAIR role", async () => {
    const scope = await minuteWhereForContext(
      makeCtx("COMMISSION_CHAIR", { isSuperAdmin: true })
    );
    expect(scope).toEqual({ clubId: "club-1" });
    expect(prismaMock.member.findFirst).not.toHaveBeenCalled();
  });

  it("scopes commission chair to their commission", async () => {
    prismaMock.member.findFirst.mockResolvedValue({
      commissionId: "comm-1",
      commissionMemberships: [{ commissionId: "comm-1" }],
    });

    const scope = await minuteWhereForContext(makeCtx("COMMISSION_CHAIR"));

    expect(scope).toEqual({
      clubId: "club-1",
      meeting: { type: "COMMISSION", commissionId: "comm-1" },
    });
  });

  it("returns empty commission scope when chair has no commission", async () => {
    prismaMock.member.findFirst.mockResolvedValue({
      commissionId: null,
      commissionMemberships: [],
    });

    const scope = await minuteWhereForContext(makeCtx("COMMISSION_CHAIR"));

    expect(scope).toEqual({
      clubId: "club-1",
      meeting: { type: "COMMISSION", commissionId: "__none__" },
    });
  });
});
