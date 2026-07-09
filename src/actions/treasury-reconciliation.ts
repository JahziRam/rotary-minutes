"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/require-permission";
import {
  autoMatchBankLines,
  importBankStatementLines,
  parseBankStatementCsv,
} from "@/lib/treasury-reconciliation";
import { validateTextUploadSize } from "@/lib/upload-limits";

function revalidateTreasury() {
  for (const loc of ["fr", "en"]) revalidatePath(`/${loc}/treasury`);
}

export async function importBankStatement(csv: string) {
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const sizeError = validateTextUploadSize(csv);
  if (sizeError) return { error: sizeError };

  const lines = parseBankStatementCsv(csv);
  if (lines.length === 0) return { error: "EMPTY_FILE" as const };

  const created = await importBankStatementLines(ctx.clubId, lines);
  revalidateTreasury();
  return { success: true as const, imported: created.length };
}

export async function autoMatchBankLinesAction() {
  const auth = await requirePermission("treasury.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const result = await autoMatchBankLines(ctx.clubId);
  revalidateTreasury();
  return { success: true as const, matched: result.matched, total: result.total };
}