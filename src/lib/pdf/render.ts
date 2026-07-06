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