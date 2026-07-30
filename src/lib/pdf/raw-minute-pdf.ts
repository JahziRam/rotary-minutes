/**
 * Pure PDF writer (no react-pdf / yoga / fontkit).
 * Guarantees a readable multi-page PV when @react-pdf fails on Vercel.
 */

export type RawMinutePdfInput = {
  clubName: string;
  title: string;
  date: string;
  location?: string;
  type: string;
  presidedBy?: string;
  secretary?: string;
  present: number;
  absent: number;
  rate: number;
  agendaItems: Array<{
    title: string;
    description?: string;
    decisions?: string;
    actions?: string;
  }>;
  attendanceLines?: string[];
  verifyUrl?: string;
};

/** Normalize text for Helvetica WinAnsi (no PDF escaping yet). */
function normalize(text: string): string {
  return String(text ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/[^\x09\x20-\x7E\xA0-\xFF]/g, "?")
    .slice(0, 400);
}

/** Escape for PDF literal string `(...)`. */
function pdfEscape(text: string): string {
  return normalize(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxChars: number): string[] {
  const clean = normalize(text).trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Build a multi-page A4 PDF with Helvetica only. */
export function buildRawMinutePdfBuffer(input: RawMinutePdfInput): Buffer {
  const lines: Array<{ text: string; size: number; bold?: boolean }> = [];

  const push = (text: string, size = 10, bold = false) => {
    for (const part of wrapLine(text, size >= 12 ? 70 : 90)) {
      lines.push({ text: part, size, bold });
    }
  };
  const blank = () => lines.push({ text: " ", size: 8 });

  push(`Rotary - ${input.clubName}`, 13, true);
  blank();
  push(input.title, 14, true);
  blank();
  push(
    `Date: ${input.date}${input.location ? ` | Lieu: ${input.location}` : ""}`
  );
  push(
    `Type: ${input.type} | Presidee par: ${input.presidedBy || "-"} | Secretaire: ${input.secretary || "-"}`
  );
  push(
    `Presents: ${input.present} | Absents: ${input.absent} | Assiduite: ${input.rate}%`
  );
  blank();
  push("Ordre du jour", 12, true);
  blank();

  if (input.agendaItems.length === 0) {
    push("(Aucun point)");
  } else {
    input.agendaItems.forEach((item, i) => {
      push(`${i + 1}. ${item.title}`, 11, true);
      if (item.description) push(item.description, 9);
      if (item.decisions) push(`Decision: ${item.decisions}`, 9);
      if (item.actions) push(`Action: ${item.actions}`, 9);
      blank();
    });
  }

  if (input.attendanceLines?.length) {
    push("Liste de presence", 12, true);
    blank();
    for (const row of input.attendanceLines) {
      push(row, 9);
    }
    blank();
  }

  if (input.verifyUrl) {
    push(`Verification: ${input.verifyUrl}`, 8);
  }
  push(`Document authentifie - ${input.clubName}`, 8);

  const LINE_H = 14;
  const TOP = 800;
  const BOTTOM = 50;
  const maxLinesPerPage = Math.floor((TOP - BOTTOM) / LINE_H);
  const pages: (typeof lines)[] = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push([{ text: "(vide)", size: 10 }]);

  // Object IDs: 1 Catalog, 2 Pages, 3 F1, 4 F2, then page/content pairs
  const kids: string[] = [];
  const bodyParts: string[] = [];
  let id = 5;
  let pageIndex = 0;

  for (const pageLines of pages) {
    pageIndex += 1;
    const pageId = id++;
    const contentId = id++;

    let y = TOP;
    const ops: string[] = ["BT"];
    for (const line of pageLines) {
      const font = line.bold ? "/F2" : "/F1";
      ops.push(`${font} ${line.size} Tf`);
      ops.push(`1 0 0 1 50 ${y} Tm`);
      ops.push(`(${pdfEscape(line.text)}) Tj`);
      y -= LINE_H;
    }
    ops.push(`/F1 8 Tf`);
    ops.push(`1 0 0 1 50 30 Tm`);
    ops.push(
      `(${pdfEscape(`Rotary Minutes - ${input.clubName}`)} - page ${pageIndex}/${pages.length}) Tj`
    );
    ops.push("ET");
    const stream = ops.join("\n");
    bodyParts.push(
      `${contentId} 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`
    );
    bodyParts.push(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>endobj\n`
    );
    kids.push(`${pageId} 0 R`);
  }

  const catalog = `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n`;
  const pagesObj = `2 0 obj<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>endobj\n`;
  const f1 = `3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`;
  const f2 = `4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n`;

  const all = [catalog, pagesObj, f1, f2, ...bodyParts];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of all) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefPos = Buffer.byteLength(body, "utf8");
  const n = all.length;
  let xref = `xref\n0 ${n + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= n; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body +=
    xref +
    `trailer<< /Size ${n + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}
