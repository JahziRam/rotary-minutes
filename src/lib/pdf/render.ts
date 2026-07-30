import React from "react";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";
import type { StatsPDFData } from "@/lib/pdf/stats-pdf";
import { buildRawMinutePdfBuffer } from "@/lib/pdf/raw-minute-pdf";

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
  // Always createElement (never call the component as a function)
  return renderToBuffer(
    React.createElement(MinutePDFDocument, { data }) as React.ReactElement
  );
}

/** Last-resort text-only layout via react-pdf (simpler tree). */
export async function renderMinimalMinutePdf(
  data: MinutePDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { MinimalMinutePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/minimal-minute-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(MinimalMinutePDFDocument, { data }) as React.ReactElement
  );
}

/**
 * Absolute last resort: handcrafted PDF, no react-pdf.
 * Always succeeds if data is available.
 */
export function renderRawMinutePdf(data: MinutePDFData): Buffer {
  const attendanceLines: string[] = [];
  if (data.annex) {
    for (const group of data.annex.memberGroups) {
      attendanceLines.push(`${group.label} (${group.people.length})`);
      for (const person of group.people) {
        attendanceLines.push(`- ${person.name}`);
      }
    }
  }
  return buildRawMinutePdfBuffer({
    clubName: data.club.name,
    title: data.title,
    date: data.meeting.date,
    location: data.meeting.location,
    type: data.meeting.type,
    presidedBy: data.meeting.presidedBy,
    secretary: data.meeting.secretary,
    present: data.attendances.present,
    absent: data.attendances.absent,
    rate: data.attendances.rate,
    agendaItems: data.agendaItems,
    attendanceLines,
    verifyUrl: data.verifyUrl,
  });
}

export async function renderStatsPdf(data: StatsPDFData): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { StatsPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/stats-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(StatsPDFDocument, { data }) as React.ReactElement
  );
}

export async function renderDuesInvoicePdf(
  data: import("@/lib/pdf/dues-invoice-pdf").DuesInvoicePDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesInvoicePDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-invoice-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(DuesInvoicePDFDocument, { data }) as React.ReactElement
  );
}

export async function renderDuesReceiptPdf(
  data: import("@/lib/pdf/dues-receipt-pdf").DuesReceiptPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesReceiptPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-receipt-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(DuesReceiptPDFDocument, { data }) as React.ReactElement
  );
}

export async function renderDuesHistoryPdf(
  data: import("@/lib/pdf/dues-history-pdf").DuesHistoryPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { DuesHistoryPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/dues-history-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(DuesHistoryPDFDocument, { data }) as React.ReactElement
  );
}

export async function renderTreasuryReportPdf(
  data: import("@/lib/pdf/treasury-report-pdf").TreasuryReportPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { TreasuryReportPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/treasury-report-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(TreasuryReportPDFDocument, {
      data,
    }) as React.ReactElement
  );
}

export async function renderAttendanceReportPdf(
  data: import("@/lib/pdf/attendance-report-pdf").AttendanceReportPDFData
): Promise<Buffer> {
  await ensurePdfHyphenationDisabled();
  const [{ renderToBuffer }, { AttendanceReportPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/attendance-report-pdf"),
  ]);
  return renderToBuffer(
    React.createElement(AttendanceReportPDFDocument, {
      data,
    }) as React.ReactElement
  );
}