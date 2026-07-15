import {
  ROTARY_BRAND,
  ROTARY_LOGO_DISPLAY,
  ROTARY_LOGO_FONTS,
} from "@/lib/rotary-brand";
import {
  ROTARY_TEXT_COLUMN_WIDTH_RATIO,
  ROTARY_WORDMARK_ASPECT,
  ROTARY_WORDMARK_PNG_BASE64,
} from "@/lib/rotary-wordmark-b64";

/**
 * Logo club par défaut : wordmark Rotary officiel (image) + nom du club
 * sous « Rotary », dans la colonne gauche (à gauche de la roue).
 */
export const CLUB_DEFAULT_LOGO = {
  maxWidth: ROTARY_LOGO_DISPLAY.maxWidthPx,
  wordmarkHeight: 48,
  /** Bas du mot « Rotary » dans le PNG (% hauteur wordmark, calibré). */
  rotaryTextBottomRatio: 0.54,
  /** Espace net entre le bas de « Rotary » et le haut du nom club (px à hauteur 48). */
  clubNameVerticalGap: 7,
  clubFontSize: 12,
  clubGap: 5,
  lineGap: 2,
  paddingX: 0,
  paddingY: 0,
} as const;

const CHAR_WIDTH_RATIO = 0.52;
const LOGO_EDGE_MARGIN = 2;
/** Hauteur des capitales au-dessus de la baseline (espace net sous « Rotary »). */
const CLUB_NAME_CAP_HEIGHT_RATIO = 0.82;

export const ROTARY_WORDMARK = "Rotary" as const;

export type ClubDefaultLogoDimensions = {
  width: number;
  height: number;
  aspectRatio: number;
};

export function getRotaryWordmarkDataUrl(): string {
  return `data:image/png;base64,${ROTARY_WORDMARK_PNG_BASE64}`;
}

export function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sous-titre club sous le wordmark (ex. « Club de Marseille Provence »). */
export function parseClubDisplayName(fullName: string): string {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Club";
  const stripped = trimmed.replace(/^rotary\s+/i, "").trim();
  return stripped || trimmed;
}

export function estimateClubNameTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_WIDTH_RATIO;
}

export function getRotaryTextColumnWidth(wordmarkHeight: number): number {
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);
  return Math.round(wordmarkWidth * ROTARY_TEXT_COLUMN_WIDTH_RATIO);
}

export function getRotaryTextColumnRightX(
  wordmarkHeight: number,
  paddingX = CLUB_DEFAULT_LOGO.paddingX
): number {
  return paddingX + getRotaryTextColumnWidth(wordmarkHeight);
}

/** @deprecated Alias — largeur colonne texte Rotary. */
export function getClubNameMaxWidth(wordmarkHeight: number): number {
  return getRotaryTextColumnWidth(wordmarkHeight);
}

function scaledClubNameGap(wordmarkHeight: number): number {
  return (
    CLUB_DEFAULT_LOGO.clubNameVerticalGap *
    (wordmarkHeight / CLUB_DEFAULT_LOGO.wordmarkHeight)
  );
}

export function scaledClubFontSize(wordmarkHeight: number): number {
  return (
    CLUB_DEFAULT_LOGO.clubFontSize *
    (wordmarkHeight / CLUB_DEFAULT_LOGO.wordmarkHeight)
  );
}

/** Décale le wordmark si le nom dépasse la colonne gauche (à gauche de la roue). */
export function getClubLogoOffsetX(
  textWidth: number,
  wordmarkHeight: number,
  paddingX = CLUB_DEFAULT_LOGO.paddingX
): number {
  const columnWidth = getRotaryTextColumnWidth(wordmarkHeight);
  return Math.max(paddingX, textWidth - columnWidth + LOGO_EDGE_MARGIN);
}

export function getClubNameTopY(
  wordmarkHeight: number,
  fontSize: number,
  paddingY = CLUB_DEFAULT_LOGO.paddingY
): number {
  const rotaryBottom = wordmarkHeight * CLUB_DEFAULT_LOGO.rotaryTextBottomRatio;
  return paddingY + rotaryBottom + scaledClubNameGap(wordmarkHeight);
}

export function getClubNameFirstBaselineY(
  wordmarkHeight: number,
  fontSize: number,
  paddingY = CLUB_DEFAULT_LOGO.paddingY
): number {
  return (
    getClubNameTopY(wordmarkHeight, fontSize, paddingY) +
    fontSize * CLUB_NAME_CAP_HEIGHT_RATIO
  );
}

export function getClubNameBlockBottomY(
  wordmarkHeight: number,
  lines: string[],
  fontSize: number,
  paddingY = CLUB_DEFAULT_LOGO.paddingY
): number {
  const { lineGap } = CLUB_DEFAULT_LOGO;
  const firstY = getClubNameFirstBaselineY(wordmarkHeight, fontSize, paddingY);
  const lastBaseline = firstY + (lines.length - 1) * (fontSize + lineGap);
  return lastBaseline + fontSize * 0.25;
}

type ClubNameLayout = {
  lines: [string];
  fontSize: number;
  textWidth: number;
  offsetX: number;
  nameAnchorX: number;
};

export function resolveClubNameLayout(
  clubName: string,
  wordmarkHeight: number
): ClubNameLayout {
  const display = parseClubDisplayName(clubName);
  const fontSize = scaledClubFontSize(wordmarkHeight);
  const textWidth = estimateClubNameTextWidth(display, fontSize);
  const offsetX = getClubLogoOffsetX(textWidth, wordmarkHeight);
  const columnWidth = getRotaryTextColumnWidth(wordmarkHeight);
  const nameAnchorX = offsetX + columnWidth;

  return {
    lines: [display],
    fontSize,
    textWidth,
    offsetX,
    nameAnchorX,
  };
}

function getClubLogoContentWidth(
  wordmarkHeight: number,
  offsetX: number,
  paddingX = CLUB_DEFAULT_LOGO.paddingX
): number {
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);
  return Math.ceil(offsetX + wordmarkWidth + LOGO_EDGE_MARGIN);
}

/** Nom club sur une seule ligne sous « Rotary ». */
export function layoutClubNameLines(clubName: string): string[] {
  return resolveClubNameLayout(clubName, CLUB_DEFAULT_LOGO.wordmarkHeight).lines;
}

export function getClubDefaultLogoDimensions(clubName: string): ClubDefaultLogoDimensions {
  const { wordmarkHeight, paddingY } = CLUB_DEFAULT_LOGO;
  const { lines, fontSize, offsetX } = resolveClubNameLayout(clubName, wordmarkHeight);
  const contentBottom = getClubNameBlockBottomY(wordmarkHeight, lines, fontSize, paddingY);

  const width = getClubLogoContentWidth(wordmarkHeight, offsetX);
  const height = Math.ceil(
    Math.max(paddingY + wordmarkHeight, contentBottom + paddingY) + LOGO_EDGE_MARGIN
  );

  return { width, height, aspectRatio: width / height };
}

/** SVG : wordmark + nom club aligné à droite sous « Rotary », à gauche de la roue. */
export function buildClubDefaultLogoSvg(clubName: string): string {
  const { wordmarkHeight, paddingY } = CLUB_DEFAULT_LOGO;
  const { width, height } = getClubDefaultLogoDimensions(clubName);
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);
  const { lines, fontSize: clubSize, offsetX, nameAnchorX } =
    resolveClubNameLayout(clubName, wordmarkHeight);
  const wordmarkHref = getRotaryWordmarkDataUrl();
  const clubTopY = getClubNameTopY(wordmarkHeight, clubSize, paddingY);
  const line = lines[0];

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvgText(clubName)}">
  <rect width="100%" height="100%" fill="${ROTARY_BRAND.white}"/>
  <image x="${offsetX}" y="${paddingY}" width="${wordmarkWidth}" height="${wordmarkHeight}" href="${wordmarkHref}" preserveAspectRatio="xMinYMin meet"/>
  <text font-family="${ROTARY_LOGO_FONTS.clubName}" text-anchor="end" dominant-baseline="hanging">
    <tspan x="${nameAnchorX}" y="${clubTopY}" font-size="${clubSize}" font-weight="400" fill="${ROTARY_BRAND.royalBlue}">${escapeSvgText(line)}</tspan>
  </text>
</svg>`;
}

export function buildClubDefaultLogoDataUrl(clubName: string): string {
  const svg = buildClubDefaultLogoSvg(clubName).replace(/\s+/g, " ").trim();
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export function buildClubDefaultLogoEmailHtml(clubName: string): string {
  const clear = ROTARY_LOGO_DISPLAY.clearSpacePx;
  const logoImg = buildClubDefaultLogoDataUrl(clubName);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:${clear}px">
        <img src="${logoImg}" alt="${escapeSvgText(clubName)}" height="${ROTARY_LOGO_DISPLAY.emailMaxHeightPx}" style="display:block;height:${ROTARY_LOGO_DISPLAY.emailMaxHeightPx}px;width:auto;max-width:${ROTARY_LOGO_DISPLAY.maxWidthPx}px;border:0" />
      </td>
    </tr>
  </table>`;
}