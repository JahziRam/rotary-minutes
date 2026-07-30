import { Image, Text, View } from "@react-pdf/renderer";
import {
  estimateClubNameTextWidth,
  getClubLogoOffsetX,
  getClubNameBlockBottomY,
  getClubNameTopY,
  getRotaryTextColumnWidth,
  parseClubDisplayName,
  scaledClubFontSize,
} from "@/lib/club-default-logo";
import { isPdfSafeImageSrc } from "@/lib/pdf/pdf-image";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";
import { ROTARY_WORDMARK_ASPECT } from "@/lib/rotary-wordmark-b64";

const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;
const WORDMARK_H = 40;
const MIN_CLUB_FONT = 6.5;
const MAX_CLUB_FONT = 11;

/**
 * Logo Rotary généré pour PDF : wordmark officiel (image) + nom club (texte Helvetica).
 * Le nom est toujours sur **une seule ligne** (wrap désactivé + police réduite si besoin).
 */
export function ClubDefaultLogoPdf({
  clubName,
  wordmarkSrc,
}: {
  clubName: string;
  /** JPEG/PNG data URL du wordmark, déjà sanitizé pour react-pdf */
  wordmarkSrc?: string | null;
}) {
  const wordmarkW = WORDMARK_H * ROTARY_WORDMARK_ASPECT;
  const columnW = getRotaryTextColumnWidth(WORDMARK_H);

  // Une seule ligne : pas de retours, espaces normalisés
  const label = parseClubDisplayName(clubName)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Club";

  // Réduire la police jusqu'à ce que le nom tienne sur une ligne dans la zone utile
  // (colonne sous « Rotary », avec décalage wordmark si trop long)
  let clubSize = Math.min(MAX_CLUB_FONT, scaledClubFontSize(WORDMARK_H));
  let textWidth = estimateClubNameTextWidth(label, clubSize);
  // Largeur max confortable : un peu plus que le wordmark (évite un bandeau énorme)
  const maxTextW = wordmarkW * 1.15;
  while (clubSize > MIN_CLUB_FONT && textWidth > maxTextW) {
    clubSize -= 0.5;
    textWidth = estimateClubNameTextWidth(label, clubSize);
  }

  const offsetX = getClubLogoOffsetX(textWidth, WORDMARK_H);
  const nameAnchorX = offsetX + columnW;
  // Boîte texte assez large pour le nom entier (pas limitée à columnW → plus de wrap)
  const textBoxW = Math.max(columnW, textWidth + 4);
  const textLeft = Math.max(0, nameAnchorX - textBoxW);

  const clubTop = getClubNameTopY(WORDMARK_H, clubSize);
  const contentHeight = Math.max(
    WORDMARK_H,
    getClubNameBlockBottomY(WORDMARK_H, [label], clubSize)
  );
  const contentWidth = Math.max(offsetX + wordmarkW, textLeft + textBoxW);
  const showWordmark = isPdfSafeImageSrc(wordmarkSrc);

  return (
    <View
      style={{
        padding: clear,
        width: contentWidth + clear,
        height: contentHeight + clear,
      }}
    >
      {showWordmark ? (
        <Image
          src={wordmarkSrc!}
          style={{
            position: "absolute",
            top: 0,
            left: offsetX,
            height: WORDMARK_H,
            width: wordmarkW,
            objectFit: "contain",
          }}
        />
      ) : (
        <Text
          wrap={false}
          style={{
            position: "absolute",
            top: 0,
            left: offsetX,
            width: columnW,
            fontFamily: "Helvetica-Bold",
            fontSize: 14,
            color: ROTARY_BRAND.royalBlue,
            textAlign: "right",
          }}
        >
          Rotary
        </Text>
      )}
      <Text
        wrap={false}
        style={{
          position: "absolute",
          left: textLeft,
          top: showWordmark ? clubTop : 16,
          width: textBoxW,
          fontFamily: "Helvetica",
          fontSize: clubSize,
          color: ROTARY_BRAND.royalBlue,
          textAlign: "right",
          // Force single line in yoga/react-pdf
          maxHeight: clubSize + 2,
          overflow: "hidden",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
