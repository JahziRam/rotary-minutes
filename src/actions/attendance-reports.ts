"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { getAttendanceReportSummary } from "@/lib/queries/attendance-reports";
import { buildAttendanceReportPdfBuffer } from "@/lib/pdf/build-attendance-report-pdf";
import { sendClubEmail } from "@/lib/club-smtp";
import { prepareBrandedEmail } from "@/lib/email-branding";

function revalidateAttendanceReports() {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/attendance-reports`);
  }
}

async function requireAttendanceReports() {
  const feature = await requireFeature("attendanceReportsEnabled", { includeMembers: true });
  if (feature.error) return feature;
  const auth = await requirePermission("attendance.view");
  if (auth.error) return auth;
  return { ctx: feature.ctx };
}

export async function listReports() {
  const auth = await requireAttendanceReports();
  if ("error" in auth && auth.error) return { error: auth.error as string };

  const { ctx } = auth;
  const summary = await getAttendanceReportSummary(ctx.clubId);

  return {
    clubRate: summary.clubRate,
    mandateLabel: summary.memberData.mandate.label,
    meetingsCount: summary.memberData.meetingsCount,
    memberRates: summary.memberData.rates,
    periodRates: summary.periodData.periods,
    meetingTypeRates: summary.typeData.rates,
    atRisk: summary.atRisk,
    canExport: ctx.features.pdfExport || ctx.isSuperAdmin,
  };
}

export async function exportAttendancePdf(locale: string) {
  const auth = await requireAttendanceReports();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  if (!ctx.isSuperAdmin && !ctx.features.pdfExport) {
    return { error: "PDF_DISABLED" as const };
  }

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { name: true },
  });
  if (!club) return { error: "NOT_FOUND" as const };

  const { buffer, filename } = await buildAttendanceReportPdfBuffer(
    ctx.clubId,
    club.name,
    locale
  );

  return {
    success: true as const,
    buffer: buffer.toString("base64"),
    filename,
    mimeType: "application/pdf",
  };
}

export async function emailReportToDistrict(locale: string) {
  const auth = await requireAttendanceReports();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  if (!ctx.isSuperAdmin && !ctx.features.pdfExport) {
    return { error: "PDF_DISABLED" as const };
  }

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { name: true, email: true, district: true, logoUrl: true, language: true },
  });
  if (!club) return { error: "NOT_FOUND" as const };
  if (!club.email) return { error: "NO_CLUB_EMAIL" as const };

  const { buffer, filename } = await buildAttendanceReportPdfBuffer(
    ctx.clubId,
    club.name,
    locale
  );

  const isFr = locale === "fr";
  const subject = isFr
    ? `Rapport d'assiduité — ${club.name}${club.district ? ` (District ${club.district})` : ""}`
    : `Attendance report — ${club.name}${club.district ? ` (District ${club.district})` : ""}`;

  const body = isFr
    ? `<p>Veuillez trouver ci-joint le rapport d'assiduité du club <strong>${club.name}</strong>.</p>`
    : `<p>Please find attached the attendance report for <strong>${club.name}</strong>.</p>`;

  const branded = await prepareBrandedEmail(body, {
    clubId: ctx.clubId,
    clubName: club.name,
    logoUrl: club.logoUrl,
  });

  const result = await sendClubEmail(ctx.clubId, {
    to: club.email,
    subject,
    html: branded.html,
    attachments: [{ filename, content: buffer }],
  });

  if (!result.ok) return { error: result.error ?? "EMAIL_FAILED" as const };

  await prisma.auditLog.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      action: "ATTENDANCE_REPORT_EMAILED",
      entity: "Club",
      entityId: ctx.clubId,
      metadata: { district: club.district, recipient: club.email },
    },
  });

  revalidateAttendanceReports();
  return { success: true as const };
}