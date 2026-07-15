import type { MinutePDFData } from "@/lib/pdf/minute-pdf";
import type { StatsPDFData } from "@/lib/pdf/stats-pdf";

let pdfHyphenationReady = false;

/** Désactive la césure automatique (évite « Ro-tary », « Bel-le-cour » dans les logos). */
async function ensurePdfHyphenationDisabled(): Promise<void> {
  if (pdfHyphenationReady) return;
  const { Font } = await import("@react-pdf/renderer");
  Font.registerHyphenationCallback((word) => [word]);
  pdfHyphenationReady = true;
}

/** Lazy-load react-pdf so it stays out of the main worker bundle. */
export async function renderMinutePdf(data: MinutePDFData): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { MinutePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/minute-pdf"),
  ]);
  return renderToBuffer(MinutePDFDocument({ data }));
}

export async function renderStatsPdf(data: StatsPDFData): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { StatsPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/stats-pdf"),
  ]);
  return renderToBuffer(StatsPDFDocument({ data }));
}

export async function renderDuesInvoicePdf(
  data: import("@/lib/pdf/dues-invoice-pdf").DuesInvoicePDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesInvoicePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-invoice-pdf"),
  ]);
  return renderToBuffer(DuesInvoicePDFDocument({ data }));
}

export async function renderDuesReceiptPdf(
  data: import("@/lib/pdf/dues-receipt-pdf").DuesReceiptPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesReceiptPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-receipt-pdf"),
  ]);
  return renderToBuffer(DuesReceiptPDFDocument({ data }));
}

export async function renderDuesHistoryPdf(
  data: import("@/lib/pdf/dues-history-pdf").DuesHistoryPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesHistoryPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-history-pdf"),
  ]);
  return renderToBuffer(DuesHistoryPDFDocument({ data }));
}

export async function renderTreasuryReportPdf(
  data: import("@/lib/pdf/treasury-report-pdf").TreasuryReportPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { TreasuryReportPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/treasury-report-pdf"),
  ]);
  return renderToBuffer(TreasuryReportPDFDocument({ data }));
}

export async function renderAttendanceReportPdf(
  data: import("@/lib/pdf/attendance-report-pdf").AttendanceReportPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { AttendanceReportPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/attendance-report-pdf"),
  ]);
  return renderToBuffer(AttendanceReportPDFDocument({ data }));
}