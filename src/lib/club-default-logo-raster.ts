import {
  buildClubDefaultLogoSvg,
  getClubDefaultLogoDimensions,
} from "@/lib/club-default-logo";

export type RasterizedClubLogo = {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
};

/**
 * Rasterise le logo SVG en PNG pour les PDF (@react-pdf ne gère pas le SVG en Image).
 */
export async function rasterizeClubDefaultLogoPng(
  clubName: string
): Promise<RasterizedClubLogo | null> {
  try {
    const sharp = (await import("sharp")).default;
    const svg = buildClubDefaultLogoSvg(clubName);
    const dims = getClubDefaultLogoDimensions(clubName);
    const scale = 3;
    const buffer = await sharp(Buffer.from(svg, "utf-8"))
      .resize({
        width: Math.round(dims.width * scale),
        height: Math.round(dims.height * scale),
        fit: "fill",
      })
      .png()
      .toBuffer();
    return {
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      width: dims.width,
      height: dims.height,
      aspectRatio: dims.aspectRatio,
    };
  } catch {
    return null;
  }
}