import "server-only";

import { prisma } from "@/lib/prisma";

export async function getHonoraryMemberIds(clubId: string): Promise<Set<string>> {
  const rows = await prisma.member.findMany({
    where: { clubId, isHonoraryMember: true },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}