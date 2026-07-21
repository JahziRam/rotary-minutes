import { prisma } from "@/lib/prisma";
import type { BirthdayMemberSource } from "@/lib/minute-attendance-annex";

/** Active club members with a birthday or spouse birthday (for PV annex week list). */
export async function loadBirthdayMembers(
  clubId: string
): Promise<BirthdayMemberSource[]> {
  return prisma.member.findMany({
    where: {
      clubId,
      isActive: true,
      OR: [{ birthday: { not: null } }, { spouseBirthday: { not: null } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthday: true,
      spouseFirstName: true,
      spouseLastName: true,
      spouseBirthday: true,
      photoUrl: true,
    },
  });
}
