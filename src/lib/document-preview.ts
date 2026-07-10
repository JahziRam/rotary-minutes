import * as XLSX from "xlsx";
import { isOfficePreviewMime, normalizeDocumentMime } from "@/lib/document-types";

function wrapPreviewHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/</g, "&lt;")}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; color: #111; background: #fff; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.5; }
    .sheet-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .sheet-tab { font-size: 12px; color: #4b5563; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 8px; }
    .doc-content { max-width: 900px; margin: 0 auto; }
    .doc-content p { margin: 0.5rem 0; line-height: 1.6; }
    .doc-content h1, .doc-content h2, .doc-content h3 { margin-top: 1.25rem; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

async function previewDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ buffer });
  return `<div class="doc-content">${result.value}</div>`;
}

function previewSpreadsheet(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const tabs = workbook.SheetNames.map(
    (name) => `<span class="sheet-tab">${name.replace(/</g, "&lt;")}</span>`
  ).join("");
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const tableHtml = firstSheet ? XLSX.utils.sheet_to_html(firstSheet) : "<p>Feuille vide</p>";
  return `<div class="sheet-tabs">${tabs}</div>${tableHtml}`;
}

function previewText(buffer: Buffer): string {
  const text = buffer.toString("utf8");
  return `<pre>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
}

export async function buildDocumentPreviewHtml(
  buffer: Buffer,
  mimeType: string,
  title: string
): Promise<string | null> {
  const mime = normalizeDocumentMime(mimeType);

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const body = await previewDocx(buffer);
    return wrapPreviewHtml(title, body);
  }

  if (
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return wrapPreviewHtml(title, previewSpreadsheet(buffer));
  }

  if (mime === "text/plain") {
    return wrapPreviewHtml(title, previewText(buffer));
  }

  if (isOfficePreviewMime(mime)) {
    return null;
  }

  return null;
}