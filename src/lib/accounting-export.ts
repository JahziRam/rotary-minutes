import type { BudgetEntryType, PaymentMethod } from "@/generated/prisma/client";

export type TreasuryExportRow = {
  id: string;
  date: Date;
  type: BudgetEntryType;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  categoryName: string | null;
};

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateTreasuryCsv(
  rows: TreasuryExportRow[],
  locale: "fr" | "en" = "fr"
): string {
  const headers =
    locale === "fr"
      ? ["Date", "Type", "Montant", "Devise", "Description", "Catégorie", "Mode de paiement", "Référence"]
      : ["Date", "Type", "Amount", "Currency", "Description", "Category", "Payment method", "Reference"];

  const lines = [headers.join(",")];

  for (const row of rows) {
    const typeLabel = row.type === "INCOME" ? (locale === "fr" ? "Recette" : "Income") : locale === "fr" ? "Dépense" : "Expense";
    lines.push(
      [
        row.date.toISOString().slice(0, 10),
        typeLabel,
        row.amount.toFixed(2),
        row.currency,
        escapeCsv(row.description),
        escapeCsv(row.categoryName ?? ""),
        row.paymentMethod ?? "",
        escapeCsv(row.reference ?? ""),
      ].join(",")
    );
  }

  return lines.join("\n");
}

function ofxDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "[0:GMT]");
}

export function generateTreasuryOfx(
  rows: TreasuryExportRow[],
  opts: { accountId: string; currency: string }
): string {
  const now = ofxDate(new Date());
  const start = rows.length
    ? ofxDate(rows.reduce((a, b) => (a.date < b.date ? a : b)).date)
    : now;
  const end = rows.length
    ? ofxDate(rows.reduce((a, b) => (a.date > b.date ? a : b)).date)
    : now;

  const transactions = rows
    .map((row) => {
      const amount = row.type === "INCOME" ? row.amount : -row.amount;
      const fitId = row.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
      return `<STMTTRN>
<TRNTYPE>${row.type === "INCOME" ? "CREDIT" : "DEBIT"}</TRNTYPE>
<DTPOSTED>${ofxDate(row.date)}</DTPOSTED>
<TRNAMT>${amount.toFixed(2)}</TRNAMT>
<FITID>${fitId}</FITID>
<NAME>${escapeXml(row.description.slice(0, 32))}</NAME>
<MEMO>${escapeXml(row.description)}</MEMO>
</STMTTRN>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>${now}</DTSERVER>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1</TRNUID>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS>
<CURDEF>${opts.currency}</CURDEF>
<BANKACCTFROM>
<BANKID>ROTARY</BANKID>
<ACCTID>${escapeXml(opts.accountId)}</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${start}</DTSTART>
<DTEND>${end}</DTEND>
${transactions}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateContactsCsv(
  contacts: Array<{
    email: string;
    firstName: string;
    lastName: string;
    company?: string | null;
  }>
): string {
  const lines = ["email,firstName,lastName,company"];
  for (const c of contacts) {
    lines.push(
      [c.email, escapeCsv(c.firstName), escapeCsv(c.lastName), escapeCsv(c.company ?? "")].join(",")
    );
  }
  return lines.join("\n");
}