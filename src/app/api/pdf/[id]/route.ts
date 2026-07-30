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

export const maxDuration = 60;

/** Minimal valid PDF so the browser never downloads a JSON error as a file. */
function errorPdfBuffer(message: string): Buffer {
  const escaped = message
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const stream = `BT /F1 12 Tf 50 750 Td (${escaped}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefPos = Buffer.byteLength(body, "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body +=
    xref +
    `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  try {
    const maint = assertMeetingsMinutesAvailable();
    if (maint) {
      if (download) {
        const buf = errorPdfBuffer(
          "Reunions et PV temporairement indisponibles (maintenance)."
        );
        return new NextResponse(new Uint8Array(buf), {
          status: 503,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="pv-maintenance.pdf"',
          },
        });
      }
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
      if (download) {
        const buf = errorPdfBuffer("PV introuvable.");
        return new NextResponse(new Uint8Array(buf), {
          status: 404,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="pv-not-found.pdf"',
          },
        });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await auth();
    const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
    const isClubMember = session?.user?.memberships?.some(
      (m) => m.clubId === minute.clubId
    );

    if (minute.status !== "FINALIZED") {
      if (!isSuperAdmin && !isClubMember) {
        if (download) {
          const buf = errorPdfBuffer("Non autorise.");
          return new NextResponse(new Uint8Array(buf), {
            status: 401,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="pv-unauthorized.pdf"',
            },
          });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!isSuperAdmin && isClubMember) {
      const features = await getClubFeatures(minute.clubId);
      if (!isFeatureEnabled(features, "pdfExport", false)) {
        if (download) {
          const buf = errorPdfBuffer(
            "Export PDF non disponible dans votre offre."
          );
          return new NextResponse(new Uint8Array(buf), {
            status: 403,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="pv-forbidden.pdf"',
            },
          });
        }
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
      url.searchParams.get("locale") ??
      (minute.club.language === "EN" ? "en" : "fr");

    const { buffer, filename } = await buildMinutePdfBuffer(minute, locale);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("[api/pdf] generation failed:", e);
    // Always return a PDF for download=1 so the browser never saves JSON as the "file".
    if (download) {
      const buf = errorPdfBuffer(
        "Echec generation PDF. Reessayez dans quelques secondes."
      );
      return new NextResponse(new Uint8Array(buf), {
        status: 500,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="pv-erreur-generation.pdf"',
        },
      });
    }
    return NextResponse.json(
      {
        error: "PDF_GENERATION_FAILED",
        message:
          "Impossible de générer le PDF pour le moment. Réessayez dans quelques secondes.",
      },
      { status: 500 }
    );
  }
}
