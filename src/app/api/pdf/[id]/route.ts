import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClubFeatures } from "@/lib/features";
import { isFeatureEnabled } from "@/lib/feature-gate";
import {
  buildMinutePdfBuffer,
  minutePdfInclude,
} from "@/lib/pdf/build-minute-pdf";
import { assertMeetingsMinutesAvailable } from "@/lib/meetings-minutes-maintenance";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const maint = assertMeetingsMinutesAvailable();
  if (maint) {
    return NextResponse.json(
      {
        error: "MAINTENANCE",
        message:
          "Réunions et PV temporairement indisponibles jusqu'au lundi 27 juillet 2026 à 12:00 (GMT+3).",
      },
      { status: 503 }
    );
  }

  const { id } = await params;

  const minute = await prisma.minute.findUnique({
    where: { id },
    include: minutePdfInclude,
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

  const { buffer, filename } = await buildMinutePdfBuffer(minute, locale);

  const download =
    new URL(request.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}