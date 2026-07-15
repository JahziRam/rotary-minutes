import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Active members counted for attendance lists and rate calculations. */
export function attendanceEligibleMemberWhere(
  clubId: string
): Prisma.MemberWhereInput {
  return {
    clubId,
    isActive: true,
    isHonoraryMember: false,
  };
}

export function isAttendanceEligibleMember(member: {
  isActive?: boolean;
  isHonoraryMember?: boolean;
}): boolean {
  return (member.isActive ?? true) && !member.isHonoraryMember;
}

export async function getHonoraryMemberIds(clubId: string): Promise<Set<string>> {
  const rows = await prisma.member.findMany({
    where: { clubId, isHonoraryMember: true },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

export function excludeHonoraryMemberAttendances<
  T extends {
    memberId?: string | null;
    member?: { isHonoraryMember?: boolean } | null | Record<string, unknown>;
  },
>(rows: T[], honoraryMemberIds?: ReadonlySet<string>): T[] {
  return rows.filter((row) => {
    if (!row.memberId) return true;
    const member = row.member as { isHonoraryMember?: boolean } | null | undefined;
    if (member?.isHonoraryMember) return false;
    if (honoraryMemberIds?.has(row.memberId)) return false;
    return true;
  });
}

export function shouldCountAttendanceForMemberId(
  memberId: string | null | undefined,
  honoraryMemberIds: ReadonlySet<string>
): boolean {
  if (!memberId) return true;
  return !honoraryMemberIds.has(memberId);
}