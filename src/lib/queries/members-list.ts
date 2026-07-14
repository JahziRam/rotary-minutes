import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPaginatedResult,
  type ParsedListParams,
  type PaginatedResult,
} from "@/lib/server-list";

export type MemberListRow = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string | null;
  isActive: boolean;
  commissionName: string | null;
  email: string | null;
  appRole: string | null;
};

function buildMemberWhere(
  clubId: string,
  params: ParsedListParams
): Prisma.MemberWhereInput {
  const where: Prisma.MemberWhereInput = { clubId };

  if (params.status === "active") where.isActive = true;
  if (params.status === "inactive") where.isActive = false;

  if (params.q) {
    where.OR = [
      { firstName: { contains: params.q, mode: "insensitive" } },
      { lastName: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { position: { contains: params.q, mode: "insensitive" } },
      { commission: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function searchMembersPaginated(
  clubId: string,
  params: ParsedListParams
): Promise<PaginatedResult<MemberListRow>> {
  const where = buildMemberWhere(clubId, params);

  const [total, rows] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: {
        commission: { select: { name: true } },
        user: {
          select: {
            memberships: {
              where: { clubId },
              select: { role: true, isActive: true },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      skip: params.skip,
      take: params.take,
    }),
  ]);

  const items = rows.map((m) => {
    const membership = m.user?.memberships[0];
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      photoUrl: m.photoUrl,
      position: m.position,
      isActive: m.isActive,
      commissionName: m.commission?.name ?? null,
      email: m.email,
      appRole: membership?.isActive ? membership.role : null,
    };
  });

  return buildPaginatedResult(items, total, params.page, params.pageSize);
}