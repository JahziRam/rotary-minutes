/**
 * Vérifie le logo club par défaut (SVG raster + PDF).
 * Usage : npx tsx scripts/verify-club-logo.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  buildClubDefaultLogoSvg,
  getClubDefaultLogoDimensions,
  parseClubDisplayName,
  resolveClubNameLayout,
} from "../src/lib/club-default-logo";
import { rasterizeClubDefaultLogoPng } from "../src/lib/club-default-logo-raster";
import { buildMinutePdfBuffer } from "../src/lib/pdf/build-minute-pdf";

const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
const outDir = path.join(desktop, "Logo-Verif-Rotary-Minutes");

const samples = [
  "Rotary Club de Marseille Provence",
  "Rotary Club of Somewhere",
  "Rotary Club de la Vallée de Montmorency et des Environs",
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const report: string[] = ["# Vérification logo club par défaut", ""];

  for (const clubName of samples) {
    const slug = parseClubDisplayName(clubName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    const dims = getClubDefaultLogoDimensions(clubName);
    const layout = resolveClubNameLayout(clubName, 48);
    const svg = buildClubDefaultLogoSvg(clubName);
    const raster = await rasterizeClubDefaultLogoPng(clubName);

    fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);
    await sharp(Buffer.from(svg, "utf-8"))
      .png()
      .toFile(path.join(outDir, `${slug}-svg.png`));

    if (raster?.dataUrl) {
      const b64 = raster.dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(outDir, `${slug}-raster.png`), Buffer.from(b64, "base64"));
    }

    report.push(`## ${clubName}`);
    report.push(`- Sous-titre : ${parseClubDisplayName(clubName)}`);
    report.push(`- Lignes : ${layout.lines.join(" | ")} (${layout.fontSize}px)`);
    report.push(`- Dimensions : ${dims.width}×${dims.height} (ratio ${dims.aspectRatio.toFixed(2)})`);
    report.push(`- Raster : ${raster ? "OK" : "ÉCHEC"}`);
    report.push("");
  }

  const minute = {
    id: "verify-logo-minute",
    title: "Procès-verbal — Vérification logo",
    contentHash: null as string | null,
    club: {
      id: "verify-logo-club",
      name: "Rotary Club de Marseille Provence",
      address: "58 cours Pierre Puget, 13006 Marseille",
      meetingLocation: null,
      logoUrl: null,
      language: "FR",
    },
    agendaItems: [
      {
        title: "Ouverture",
        description: "Séance ouverte.",
        decisions: "",
        actions: "",
      },
    ],
    meeting: {
      date: new Date("2026-07-15T12:45:00"),
      location: "Marseille",
      type: "WEEKLY",
      presidedBy: "Test",
      secretary: "Test",
      attendances: [
        { category: "PRESENT", member: { firstName: "Jean", lastName: "Dupont" } },
      ],
    },
  };

  const { buffer } = await buildMinutePdfBuffer(minute, "fr");
  fs.writeFileSync(path.join(outDir, "PV-Verif-Logo.pdf"), buffer);
  report.push("## PDF");
  report.push(`- PV généré : PV-Verif-Logo.pdf (${buffer.length} octets)`);

  fs.writeFileSync(path.join(outDir, "RAPPORT.md"), report.join("\n"));
  console.log(`Fichiers écrits dans : ${outDir}`);
  console.log(report.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});