import { prisma } from "@/lib/prisma";

export type MemberDuplicateCandidate = {
  email?: string | null;
  registrationNumber?: string | null;
  firstName: string;
  lastName: string;
};

export type MemberDuplicateMatch = {
  id: string;
  userId: string | null;
  isActive: boolean;
};

export type MemberDuplicateIndex = {
  emails: Set<string>;
  registrationNumbers: Set<string>;
  names: Set<string>;
};

export function normalizeMemberEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizeMemberRegistrationNumber(
  registrationNumber: string | null | undefined
): string | null {
  const value = registrationNumber?.trim();
  return value || null;
}

export function memberNameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

export function buildMemberDuplicateIndex(
  members: Array<{
    email: string | null;
    registrationNumber: string | null;
    firstName: string;
    lastName: string;
  }>
): MemberDuplicateIndex {
  const index: MemberDuplicateIndex = {
    emails: new Set(),
    registrationNumbers: new Set(),
    names: new Set(),
  };

  for (const member of members) {
    const email = normalizeMemberEmail(member.email);
    if (email) index.emails.add(email);

    const registrationNumber = normalizeMemberRegistrationNumber(member.registrationNumber);
    if (registrationNumber) index.registrationNumbers.add(registrationNumber);

    index.names.add(memberNameKey(member.firstName, member.lastName));
  }

  return index;
}

export function isDuplicateInMemberIndex(
  existing: MemberDuplicateIndex,
  batch: MemberDuplicateIndex,
  candidate: MemberDuplicateCandidate
): boolean {
  const email = normalizeMemberEmail(candidate.email);
  const registrationNumber = normalizeMemberRegistrationNumber(candidate.registrationNumber);
  const name = memberNameKey(candidate.firstName, candidate.lastName);

  if (email && (existing.emails.has(email) || batch.emails.has(email))) {
    return true;
  }

  if (
    registrationNumber &&
    (existing.registrationNumbers.has(registrationNumber) ||
      batch.registrationNumbers.has(registrationNumber))
  ) {
    return true;
  }

  if (!email && (existing.names.has(name) || batch.names.has(name))) {
    return true;
  }

  return false;
}

export function trackMemberInDuplicateIndex(
  batch: MemberDuplicateIndex,
  candidate: MemberDuplicateCandidate
) {
  const email = normalizeMemberEmail(candidate.email);
  const registrationNumber = normalizeMemberRegistrationNumber(candidate.registrationNumber);

  if (email) batch.emails.add(email);
  if (registrationNumber) batch.registrationNumbers.add(registrationNumber);
  if (!email) batch.names.add(memberNameKey(candidate.firstName, candidate.lastName));
}

export async function findMemberDuplicateInClub(
  clubId: string,
  candidate: MemberDuplicateCandidate,
  excludeMemberId?: string
): Promise<MemberDuplicateMatch | null> {
  const email = normalizeMemberEmail(candidate.email);
  const registrationNumber = normalizeMemberRegistrationNumber(candidate.registrationNumber);
  const baseWhere = {
    clubId,
    ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
  };

  if (email) {
    const match = await prisma.member.findFirst({
      where: {
        ...baseWhere,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true, userId: true, isActive: true },
    });
    if (match) return match;
  }

  if (registrationNumber) {
    const match = await prisma.member.findFirst({
      where: {
        ...baseWhere,
        registrationNumber,
      },
      select: { id: true, userId: true, isActive: true },
    });
    if (match) return match;
  }

  if (!email) {
    const match = await prisma.member.findFirst({
      where: {
        ...baseWhere,
        firstName: { equals: candidate.firstName.trim(), mode: "insensitive" },
        lastName: { equals: candidate.lastName.trim(), mode: "insensitive" },
      },
      select: { id: true, userId: true, isActive: true },
    });
    if (match) return match;
  }

  return null;
}