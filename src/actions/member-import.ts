"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

function revalidateMembers() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/members`);
    revalidatePath(`/${loc}/dashboard`);
    revalidatePath(`/${loc}/onboarding`);
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

export async function importMembersFromCsv(csv: string) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { error: "EMPTY_CSV" as const };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, ""));
  const idx = (name: string) => header.indexOf(name);

  const firstNameIdx = idx("firstname");
  const lastNameIdx = idx("lastname");
  if (firstNameIdx < 0 || lastNameIdx < 0) {
    return { error: "INVALID_HEADERS" as const };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const firstName = cols[firstNameIdx]?.trim();
    const lastName = cols[lastNameIdx]?.trim();
    if (!firstName || !lastName) {
      skipped++;
      continue;
    }

    const email = cols[idx("email")]?.trim().toLowerCase() || null;
    const phone = cols[idx("phone")]?.trim() || null;
    const position = cols[idx("position")]?.trim() || null;
    const registrationNumber = cols[idx("registrationnumber")]?.trim() || null;
    const joinDateRaw = cols[idx("joindate")]?.trim() || cols[idx("joinedat")]?.trim();
    const joinDate = joinDateRaw ? new Date(joinDateRaw) : null;

    try {
      if (email) {
        const existing = await prisma.member.findFirst({
          where: { clubId: ctx.clubId, email },
        });
        if (existing) {
          await prisma.member.update({
            where: { id: existing.id },
            data: {
              firstName,
              lastName,
              phone,
              position,
              registrationNumber,
              ...(joinDate && !Number.isNaN(joinDate.getTime()) ? { joinDate } : {}),
            },
          });
        } else {
          await prisma.member.create({
            data: {
              clubId: ctx.clubId,
              firstName,
              lastName,
              email,
              phone,
              position,
              registrationNumber,
              joinDate: joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate : undefined,
              isActive: true,
            },
          });
        }
      } else {
        await prisma.member.create({
          data: {
            clubId: ctx.clubId,
            firstName,
            lastName,
            phone,
            position,
            registrationNumber,
            joinDate: joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate : undefined,
            isActive: true,
          },
        });
      }
      imported++;
    } catch (e) {
      errors.push(`Ligne ${i + 1}: ${e instanceof Error ? e.message : "erreur"}`);
      skipped++;
    }
  }

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: { memberCount: await prisma.member.count({ where: { clubId: ctx.clubId, isActive: true } }) },
  });

  revalidateMembers();
  return { success: true as const, imported, skipped, errors };
}