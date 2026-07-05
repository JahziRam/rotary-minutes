import { prisma } from "@/lib/prisma";
import type { DistrictAccessRole } from "@/generated/prisma/client";

export type DistrictAccessInfo = {
  id: string;
  district: string;
  role: DistrictAccessRole;
  canViewPV: boolean;
  expiresAt: Date | null;
};

function isAccessActive(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt > new Date();
}

export async function getUserDistrictAccesses(userId: string): Promise<DistrictAccessInfo[]> {
  const rows = await prisma.districtAccess.findMany({
    where: { userId },
    orderBy: { district: "asc" },
  });

  return rows
    .filter((row) => isAccessActive(row.expiresAt))
    .map((row) => ({
      id: row.id,
      district: row.district,
      role: row.role,
      canViewPV: row.canViewPV,
      expiresAt: row.expiresAt,
    }));
}

export async function getDistrictAccessForUser(
  userId: string,
  district: string
): Promise<DistrictAccessInfo | null> {
  const accesses = await getUserDistrictAccesses(userId);
  return accesses.find((a) => a.district === district) ?? null;
}

export async function canAccessDistrict(userId: string, district: string): Promise<boolean> {
  const access = await getDistrictAccessForUser(userId, district);
  return access !== null;
}

export async function isDistrictGovernor(userId: string, district: string): Promise<boolean> {
  const access = await getDistrictAccessForUser(userId, district);
  return access?.role === "GOVERNOR" || access?.role === "ADG";
}

export async function canViewDistrictMinutes(
  userId: string,
  district: string
): Promise<boolean> {
  const access = await getDistrictAccessForUser(userId, district);
  if (!access?.canViewPV) return false;
  return access.role === "GOVERNOR" || access.role === "ADG";
}