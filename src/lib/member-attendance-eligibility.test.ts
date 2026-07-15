import { describe, expect, it } from "vitest";
import {
  excludeHonoraryMemberAttendances,
  isAttendanceEligibleMember,
  shouldCountAttendanceForMemberId,
} from "@/lib/member-attendance-eligibility";

describe("member-attendance-eligibility", () => {
  it("detects attendance-eligible members", () => {
    expect(isAttendanceEligibleMember({ isActive: true, isHonoraryMember: false })).toBe(true);
    expect(isAttendanceEligibleMember({ isActive: true, isHonoraryMember: true })).toBe(false);
    expect(isAttendanceEligibleMember({ isActive: false, isHonoraryMember: false })).toBe(false);
  });

  it("excludes honorary member attendances", () => {
    const rows = [
      { memberId: "m1", member: { isHonoraryMember: false } },
      { memberId: "m2", member: { isHonoraryMember: true } },
      { guestName: "Guest", memberId: null },
    ];
    expect(excludeHonoraryMemberAttendances(rows)).toEqual([
      { memberId: "m1", member: { isHonoraryMember: false } },
      { guestName: "Guest", memberId: null },
    ]);
  });

  it("supports honorary id sets", () => {
    const honoraryIds = new Set(["m2"]);
    expect(shouldCountAttendanceForMemberId("m1", honoraryIds)).toBe(true);
    expect(shouldCountAttendanceForMemberId("m2", honoraryIds)).toBe(false);
    expect(shouldCountAttendanceForMemberId(null, honoraryIds)).toBe(true);
  });
});