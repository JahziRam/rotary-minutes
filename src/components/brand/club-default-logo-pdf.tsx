import { Image, Text, View } from "@react-pdf/renderer";
import {
  getClubNameBlockBottomY,
  getClubNameTopY,
  getRotaryTextColumnWidth,
  resolveClubNameLayout,
} from "@/lib/club-default-logo";
import { isPdfSafeImageSrc } from "@/lib/pdf/pdf-image";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";
import { ROTARY_WORDMARK_ASPECT } from "@/lib/rotary-wordmark-b64";

const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;
const WORDMARK_H = 40;

/**
 * Logo Rotary généré pour PDF : wordmark officiel (image) + nom club (texte Helvetica).
 * Le nom n'est PAS rasterisé via sharp (pas de polices Arial sur Vercel Linux).
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
  const { lines, fontSize: clubSize, offsetX } = resolveClubNameLayout(
    clubName,
    WORDMARK_H
  );
  const clubTop = getClubNameTopY(WORDMARK_H, clubSize);
  const contentHeight = Math.max(
    WORDMARK_H,
    getClubNameBlockBottomY(WORDMARK_H, lines, clubSize)
  );
  const contentWidth = offsetX + wordmarkW;
  const label = (lines[0] || clubName || "Rotary").replace(/\u0000/g, "");
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
      <View
        style={{
          position: "absolute",
          left: offsetX,
          top: showWordmark ? clubTop : 16,
          width: columnW,
          alignItems: "flex-end",
        }}
      >
        <Text
          wrap={false}
          style={{
            fontFamily: "Helvetica",
            fontSize: Math.max(7, Math.min(clubSize, 11)),
            color: ROTARY_BRAND.royalBlue,
            textAlign: "right",
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
