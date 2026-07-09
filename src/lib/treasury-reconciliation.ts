import { prisma } from "@/lib/prisma";

export type BankLineInput = {
  date: string;
  description: string;
  amount: number;
  reference?: string;
};

export function parseBankStatementCsv(csv: string): BankLineInput[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const start = lines[0].toLowerCase().includes("date") ? 1 : 0;
  const rows: BankLineInput[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    const amount = parseFloat(parts[2].replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(amount)) continue;
    rows.push({
      date: parts[0],
      description: parts[1],
      amount,
      reference: parts[3] || undefined,
    });
  }
  return rows;
}

export async function importBankStatementLines(clubId: string, lines: BankLineInput[]) {
  const created = [];
  for (const line of lines) {
    const row = await prisma.bankStatementLine.create({
      data: {
        clubId,
        date: new Date(line.date),
        description: line.description,
        amount: line.amount,
        reference: line.reference ?? null,
      },
    });
    created.push(row);
  }
  return created;
}

export async function autoMatchBankLines(clubId: string) {
  const unmatched = await prisma.bankStatementLine.findMany({
    where: { clubId, matchedEntryId: null },
    orderBy: { date: "asc" },
  });

  const entries = await prisma.budgetEntry.findMany({
    where: { clubId },
    select: { id: true, date: true, amount: true, description: true, type: true },
  });

  let matched = 0;
  for (const line of unmatched) {
    const lineAmt = Math.abs(Number(line.amount));
    const lineDate = line.date.toISOString().slice(0, 10);
    const hit = entries.find((e) => {
      const entryAmt = Number(e.amount);
      const entryDate = e.date.toISOString().slice(0, 10);
      return entryDate === lineDate && Math.abs(entryAmt - lineAmt) < 0.01;
    });
    if (hit) {
      await prisma.bankStatementLine.update({
        where: { id: line.id },
        data: { matchedEntryId: hit.id },
      });
      matched++;
    }
  }
  return { matched, total: unmatched.length };
}