import { describe, expect, it } from "vitest";
import {
  excludeHonoraryMemberAttendances,
  filterAttendancesForRate,
  isAttendanceEligibleMember,
  shouldCountAttendanceForMemberId,
} from "@/lib/member-attendance-eligibility";
import { computeRecordedAttendanceRate } from "@/lib/rotary";

describe("member-attendance-eligibility", () => {
  it("detects attendance-eligible members", () => {
    expect(isAttendanceEligibleMember({ isActive: true, isHonoraryMember: false })).toBe(true);
    expect(isAttendanceEligibleMember({ isActive: true, isHonoraryMember: true })).toBe(false);
    expect(isAttendanceEligibleMember({ isActive: false, isHonoraryMember: false })).toBe(false);
  });

  it("excludes honorary member attendances from annex lists but keeps guests", () => {
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

  it("filters rate rows to non-honorary members only", () => {
    const rows = [
      { memberId: "m1", member: { isHonoraryMember: false }, category: "PRESENT" },
      { memberId: "m2", member: { isHonoraryMember: true }, category: "PRESENT" },
      { guestName: "Guest", memberId: null, category: "VISITOR" },
    ];
    expect(filterAttendancesForRate(rows)).toEqual([
      { memberId: "m1", member: { isHonoraryMember: false }, category: "PRESENT" },
    ]);
  });

  it("does not count honorary members or guests toward attendance rate", () => {
    const honoraryIds = new Set(["m2"]);
    expect(shouldCountAttendanceForMemberId("m1", honoraryIds)).toBe(true);
    expect(shouldCountAttendanceForMemberId("m2", honoraryIds)).toBe(false);
    expect(shouldCountAttendanceForMemberId(null, honoraryIds)).toBe(false);

    const rate = computeRecordedAttendanceRate([
      { memberId: "m1", category: "PRESENT", member: { isHonoraryMember: false } },
      { memberId: "m2", category: "PRESENT", member: { isHonoraryMember: true } },
      { memberId: null, category: "VISITOR" },
      { memberId: "m3", category: "EXCUSED_ABSENT", member: { isHonoraryMember: false } },
    ]);
    // 1 present out of 2 countable members
    expect(rate).toBe(50);
  });
});