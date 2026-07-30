import {
  CLUB_DEFAULT_LOGO,
  escapeSvgText,
  getClubDefaultLogoDimensions,
  getClubNameTopY,
  resolveClubNameLayout,
} from "@/lib/club-default-logo";
import { ROTARY_BRAND } from "@/lib/rotary-brand";
import {
  ROTARY_WORDMARK_ASPECT,
  ROTARY_WORDMARK_PNG_BASE64,
} from "@/lib/rotary-wordmark-b64";

export type RasterizedClubLogo = {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
};

/**
 * Rasterise le logo club par défaut : wordmark Rotary officiel + nom du club.
 *
 * Composition sharp (wordmark PNG + calque texte SVG) — plus fiable sur Vercel
 * que le SVG complet avec image base64 embarquée (souvent incomplète / vide).
 */
export async function rasterizeClubDefaultLogoPng(
  clubName: string
): Promise<RasterizedClubLogo | null> {
  try {
    const sharp = (await import("sharp")).default;
    const dims = getClubDefaultLogoDimensions(clubName);
    const scale = 3;
    const width = Math.max(1, Math.round(dims.width * scale));
    const height = Math.max(1, Math.round(dims.height * scale));

    const wordmarkHeight = CLUB_DEFAULT_LOGO.wordmarkHeight;
    const layout = resolveClubNameLayout(clubName, wordmarkHeight);
    const paddingY = CLUB_DEFAULT_LOGO.paddingY;

    const wmH = Math.round(wordmarkHeight * scale);
    const wmW = Math.round(wmH * ROTARY_WORDMARK_ASPECT);
    const offsetX = Math.round(layout.offsetX * scale);
    const topY = Math.round(paddingY * scale);

    const wordmarkBuf = await sharp(
      Buffer.from(ROTARY_WORDMARK_PNG_BASE64, "base64")
    )
      .resize(wmW, wmH, { fit: "fill" })
      .png()
      .toBuffer();

    const clubTopY = Math.round(
      getClubNameTopY(wordmarkHeight, layout.fontSize, paddingY) * scale
    );
    const nameAnchorX = Math.round(layout.nameAnchorX * scale);
    const clubSize = Math.max(10, Math.round(layout.fontSize * scale));
    const line = layout.lines[0] || clubName || "Rotary";

    // Text-only SVG (no embedded images) — sharp renders this reliably
    const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text
    font-family="Arial, Helvetica, sans-serif"
    text-anchor="end"
    dominant-baseline="hanging"
    x="${nameAnchorX}"
    y="${clubTopY}"
    font-size="${clubSize}"
    font-weight="400"
    fill="${ROTARY_BRAND.royalBlue}"
  >${escapeSvgText(line)}</text>
</svg>`;

    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        {
          input: wordmarkBuf,
          left: Math.max(0, Math.min(offsetX, width - wmW)),
          top: Math.max(0, Math.min(topY, height - wmH)),
        },
        { input: Buffer.from(textSvg, "utf-8"), left: 0, top: 0 },
      ])
      .png()
      .toBuffer();

    if (buffer.byteLength < 64) return null;

    return {
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      width: dims.width,
      height: dims.height,
      aspectRatio: dims.aspectRatio,
    };
  } catch (e) {
    console.warn(
      "[rasterizeClubDefaultLogoPng] failed:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}
