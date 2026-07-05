import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { MinutePDFDocument } from "@/lib/pdf/minute-pdf";
import { generateMinuteHash, getVerifyUrl } from "@/lib/hash";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRecordedAttendanceRate } from "@/lib/rotary";
import { getClubFeatures } from "@/lib/features";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const minute = await prisma.minute.findUnique({
    where: { id },
    include: {
      club: true,
      agendaItems: { orderBy: { sortOrder: "asc" } },
      meeting: { include: { attendances: true } },
    },
  });

  if (!minute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const isClubMember = session?.user?.memberships?.some(
    (m) => m.clubId === minute.clubId
  );

  if (minute.status !== "FINALIZED") {
    if (!isSuperAdmin && !isClubMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isSuperAdmin && isClubMember) {
    const features = await getClubFeatures(minute.clubId);
    if (!isFeatureEnabled(features, "pdfExport", false)) {
      return NextResponse.json(
        {
          error: "FEATURE_DISABLED",
          feature: "pdfExport",
          message:
            "L'export PDF n'est pas disponible dans votre offre. Passez à une offre supérieure.",
        },
        { status: 403 }
      );
    }
  }

  const locale =
    new URL(request.url).searchParams.get("locale") ??
    (minute.club.language === "EN" ? "en" : "fr");
  const dateLocale = locale === "en" ? enUS : fr;

  const hash =
    minute.contentHash ??
    generateMinuteHash({
      id: minute.id,
      title: minute.title,
      agendaItems: minute.agendaItems,
      meeting: minute.meeting,
      attendances: minute.meeting.attendances,
    });

  const verifyUrl = minute.verifyUrl ?? getVerifyUrl(hash, baseUrl, locale);
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200 });

  const present = minute.meeting.attendances.filter((a) => a.category === "PRESENT").length;
  const total = minute.meeting.attendances.length;
  const rate = computeRecordedAttendanceRate(minute.meeting.attendances) ?? 0;

  const pdfData = {
    club: {
      name: minute.club.name,
      address: minute.club.address ?? minute.club.meetingLocation ?? undefined,
      logoUrl: minute.club.logoUrl ?? undefined,
    },
    meeting: {
      date: format(minute.meeting.date, "d MMMM yyyy", { locale: dateLocale }),
      location: minute.meeting.location ?? undefined,
      type: minute.meeting.type,
      presidedBy: minute.meeting.presidedBy ?? undefined,
      secretary: minute.meeting.secretary ?? undefined,
    },
    title: minute.title,
    attendances: { present, absent: total - present, rate },
    agendaItems: minute.agendaItems.map((item) => ({
      title: item.title,
      description: item.description ?? undefined,
      decisions: item.decisions ?? undefined,
      actions: item.actions ?? undefined,
    })),
    hash,
    qrCodeDataUrl,
    verifyUrl,
  };

  const buffer = await renderToBuffer(MinutePDFDocument({ data: pdfData }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pv-${id}.pdf"`,
    },
  });
}