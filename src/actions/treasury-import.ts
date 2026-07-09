"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import type { BudgetEntryType, PaymentMethod, TreasuryCollectionStatus } from "@/generated/prisma/client";
import { validateTextUploadSize } from "@/lib/upload-limits";

function revalidateTreasury() {
  for (const loc of ["fr", "en"]) revalidatePath(`/${loc}/treasury`);
}

async function requireTreasuryImport() {
  const feature = await requireFeature("treasuryImportEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  return auth;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const PAYMENT_MAP: Record<string, PaymentMethod> = {
  CASH: "CASH",
  CHECK: "CHECK",
  BANK_TRANSFER: "BANK_TRANSFER",
  STRIPE: "STRIPE",
  MOBILE_MONEY: "MOBILE_MONEY",
  OTHER: "OTHER",
};

export async function importTreasuryCsv(csvContent: string) {
  const auth = await requireTreasuryImport();
  if (auth.error) return auth;
  const { ctx } = auth;

  const sizeError = validateTextUploadSize(csvContent);
  if (sizeError) return { error: sizeError };

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { error: "EMPTY_FILE" as const };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const required = ["date", "type", "amount", "description"];
  for (const col of required) {
    if (!header.includes(col)) return { error: "INVALID_HEADER" as const, missing: col };
  }

  const idx = (name: string) => header.indexOf(name);
  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true },
  });

  const categories = await prisma.budgetCategory.findMany({
    where: { clubId: ctx.clubId },
  });
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    try {
      const typeRaw = cols[idx("type")]?.toUpperCase();
      if (typeRaw !== "INCOME" && typeRaw !== "EXPENSE") {
        errors.push(`Ligne ${i + 1}: type invalide`);
        continue;
      }
      const amount = parseFloat(cols[idx("amount")]?.replace(",", ".") ?? "");
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Ligne ${i + 1}: montant invalide`);
        continue;
      }

      const dateStr = cols[idx("date")];
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        errors.push(`Ligne ${i + 1}: date invalide`);
        continue;
      }

      const categoryName = cols[idx("category")]?.trim();
      let categoryId: string | null = null;
      if (categoryName) {
        categoryId = catByName.get(categoryName.toLowerCase()) ?? null;
        if (!categoryId) {
          const created = await prisma.budgetCategory.create({
            data: {
              clubId: ctx.clubId,
              name: categoryName,
              type: typeRaw as BudgetEntryType,
              sortOrder: categories.length + imported,
            },
          });
          categoryId = created.id;
          catByName.set(categoryName.toLowerCase(), created.id);
        }
      }

      const pmRaw = cols[idx("payment_method")]?.toUpperCase().replace(/ /g, "_");
      const paymentMethod = pmRaw ? PAYMENT_MAP[pmRaw] ?? "OTHER" : null;
      const collRaw = cols[idx("collection_status")]?.toUpperCase();
      const collectionStatus: TreasuryCollectionStatus =
        collRaw === "RECEIVABLE" ? "RECEIVABLE" : "COLLECTED";

      await prisma.budgetEntry.create({
        data: {
          clubId: ctx.clubId,
          type: typeRaw as BudgetEntryType,
          amount,
          currency: club?.currency ?? "EUR",
          date,
          description: cols[idx("description")] || "Import CSV",
          categoryId,
          paymentMethod,
          reference: cols[idx("reference")] || null,
          collectionStatus,
          recordedById: ctx.userId,
        },
      });
      imported++;
    } catch {
      errors.push(`Ligne ${i + 1}: erreur`);
    }
  }

  revalidateTreasury();
  return { success: true as const, imported, errors };
}