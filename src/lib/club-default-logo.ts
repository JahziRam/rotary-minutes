import {
  ROTARY_BRAND,
  ROTARY_LOGO_DISPLAY,
  ROTARY_LOGO_FONTS,
} from "@/lib/rotary-brand";
import {
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
  /** Largeur max du nom club (% largeur wordmark), à gauche de la roue. */
  clubNameMaxWidthRatio: 0.53,
  /** Baseline 1re ligne du nom club (% hauteur wordmark). */
  clubNameBaselineRatio: 0.74,
  clubFontSize: 10,
  clubGap: 5,
  lineGap: 2,
  paddingX: 0,
  paddingY: 0,
} as const;

const CHAR_WIDTH_RATIO = 0.52;

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

export function getClubNameMaxWidth(wordmarkHeight: number): number {
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);
  return Math.round(wordmarkWidth * CLUB_DEFAULT_LOGO.clubNameMaxWidthRatio);
}

function fitsClubNameLine(text: string, maxWidth: number, fontSize: number): boolean {
  return estimateClubNameTextWidth(text, fontSize) <= maxWidth;
}

function wrapClubNameWords(display: string, maxWidth: number, fontSize: number): string[] {
  const words = display.split(" ");
  if (words.length <= 1) return [display];

  let best: string[] | null = null;
  for (let split = 1; split < words.length; split++) {
    const line1 = words.slice(0, split).join(" ");
    const line2 = words.slice(split).join(" ");
    if (
      fitsClubNameLine(line1, maxWidth, fontSize) &&
      fitsClubNameLine(line2, maxWidth, fontSize)
    ) {
      best = [line1, line2];
    }
  }
  if (best) return best;

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fitsClubNameLine(candidate, maxWidth, fontSize)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines.slice(0, 2) : ["Club"];
}

type ClubNameLayout = {
  lines: [string] | [string, string];
  fontSize: number;
  maxWidth: number;
};

export function resolveClubNameLayout(
  clubName: string,
  wordmarkHeight: number
): ClubNameLayout {
  const display = parseClubDisplayName(clubName);
  const maxWidth = getClubNameMaxWidth(wordmarkHeight);
  const candidates = [10, 9.5, 9, 8.5, 8, 7.5, 7];

  for (const fontSize of candidates) {
    const wrapped = wrapClubNameWords(display, maxWidth, fontSize);
    const isComplete = wrapped.join(" ") === display;
    if (
      isComplete &&
      wrapped.every((line) => estimateClubNameTextWidth(line, fontSize) <= maxWidth)
    ) {
      const lines =
        wrapped.length === 1
          ? ([wrapped[0]] as [string])
          : ([wrapped[0], wrapped[1]] as [string, string]);
      return { lines, fontSize, maxWidth };
    }
  }

  const fallback = wrapClubNameWords(display, maxWidth, 8);
  const lines =
    fallback.length === 1
      ? ([fallback[0]] as [string])
      : ([fallback[0], fallback[1]] as [string, string]);
  return { lines, fontSize: 8, maxWidth };
}

/** Découpe le nom club pour tenir sous « Rotary », à gauche de la roue. */
export function layoutClubNameLines(
  clubName: string,
  options?: { maxWidth?: number; fontSize?: number }
): [string] | [string, string] {
  const wordmarkHeight = CLUB_DEFAULT_LOGO.wordmarkHeight;
  const layout = resolveClubNameLayout(clubName, wordmarkHeight);
  if (options?.maxWidth && options.maxWidth !== layout.maxWidth) {
    const display = parseClubDisplayName(clubName);
    const fontSize = options.fontSize ?? layout.fontSize;
    const wrapped = wrapClubNameWords(display, options.maxWidth, fontSize);
    if (wrapped.length === 1) return [wrapped[0]];
    return [wrapped[0], wrapped[1]];
  }
  return layout.lines;
}

export function getClubDefaultLogoDimensions(clubName: string): ClubDefaultLogoDimensions {
  const { wordmarkHeight, paddingX, paddingY, maxWidth } = CLUB_DEFAULT_LOGO;
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);

  const width = Math.min(maxWidth, Math.ceil(paddingX * 2 + wordmarkWidth + 2));
  const height = Math.ceil(paddingY * 2 + wordmarkHeight + 2);

  return { width, height, aspectRatio: width / height };
}

/** SVG : image wordmark Rotary + nom du club sous « Rotary », à gauche de la roue. */
export function buildClubDefaultLogoSvg(clubName: string): string {
  const { wordmarkHeight, clubNameBaselineRatio, lineGap, paddingX, paddingY } =
    CLUB_DEFAULT_LOGO;
  const { width, height } = getClubDefaultLogoDimensions(clubName);
  const wordmarkWidth = Math.round(wordmarkHeight * ROTARY_WORDMARK_ASPECT);
  const { lines, fontSize: clubSize, maxWidth: clubMaxWidth } =
    resolveClubNameLayout(clubName, wordmarkHeight);
  const wordmarkHref = getRotaryWordmarkDataUrl();
  const baselineRatio =
    lines.length > 1 ? clubNameBaselineRatio - 0.06 : clubNameBaselineRatio;
  const clubStartY = paddingY + wordmarkHeight * baselineRatio + clubSize * 0.1;

  const clubLines = lines
    .map((line, i) => {
      const y = clubStartY + i * (clubSize + lineGap);
      return `<tspan x="${paddingX}" y="${y}" font-size="${clubSize}" font-weight="400" fill="${ROTARY_BRAND.royalBlue}">${escapeSvgText(line)}</tspan>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvgText(clubName)}">
  <rect width="100%" height="100%" fill="${ROTARY_BRAND.white}"/>
  <image x="${paddingX}" y="${paddingY}" width="${wordmarkWidth}" height="${wordmarkHeight}" href="${wordmarkHref}" preserveAspectRatio="xMinYMin meet"/>
  <clipPath id="club-name-column">
    <rect x="${paddingX}" y="${paddingY}" width="${clubMaxWidth}" height="${wordmarkHeight}"/>
  </clipPath>
  <text font-family="${ROTARY_LOGO_FONTS.clubName}" clip-path="url(#club-name-column)">
    ${clubLines}
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