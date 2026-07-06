import type { MinutePDFData } from "@/lib/pdf/minute-pdf";
import type { StatsPDFData } from "@/lib/pdf/stats-pdf";

/** Lazy-load react-pdf so it stays out of the main worker bundle. */
export async function renderMinutePdf(data: MinutePDFData): Promise<Buffer> {
  const [{ renderToBuffer }, { MinutePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/minute-pdf"),
  ]);
  return renderToBuffer(MinutePDFDocument({ data }));
}

export async function renderStatsPdf(data: StatsPDFData): Promise<Buffer> {
  const [{ renderToBuffer }, { StatsPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/stats-pdf"),
  ]);
  return renderToBuffer(StatsPDFDocument({ data }));
}

export async function renderDuesInvoicePdf(
  data: import("@/lib/pdf/dues-invoice-pdf").DuesInvoicePDFData
): Promise<Buffer> {
  const [{ renderToBuffer }, { DuesInvoicePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-invoice-pdf"),
  ]);
  return renderToBuffer(DuesInvoicePDFDocument({ data }));
}

export async function renderDuesReceiptPdf(
  data: import("@/lib/pdf/dues-receipt-pdf").DuesReceiptPDFData
): Promise<Buffer> {
  const [{ renderToBuffer }, { DuesReceiptPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-receipt-pdf"),
  ]);
  return renderToBuffer(DuesReceiptPDFDocument({ data }));
}

export async function renderDuesHistoryPdf(
  data: import("@/lib/pdf/dues-history-pdf").DuesHistoryPDFData
): Promise<Buffer> {
  const [{ renderToBuffer }, { DuesHistoryPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-history-pdf"),
  ]);
  return renderToBuffer(DuesHistoryPDFDocument({ data }));
}