import { Image, Text, View } from "@react-pdf/renderer";
import {
  getClubNameBlockBottomY,
  getClubNameTopY,
  getRotaryTextColumnWidth,
  getRotaryWordmarkDataUrl,
  resolveClubNameLayout,
} from "@/lib/club-default-logo";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";
import { ROTARY_WORDMARK_ASPECT } from "@/lib/rotary-wordmark-b64";
import { isPdfSafeImageSrc } from "@/lib/pdf/pdf-image";

const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;
const WORDMARK_H = 38;

/** Repli PDF : wordmark + nom club à gauche de la roue, sous « Rotary ». */
export function ClubDefaultLogoPdf({ clubName }: { clubName: string }) {
  const wordmarkW = WORDMARK_H * ROTARY_WORDMARK_ASPECT;
  const columnW = getRotaryTextColumnWidth(WORDMARK_H);
  const { lines, fontSize: clubSize, offsetX } = resolveClubNameLayout(clubName, WORDMARK_H);
  const clubTop = getClubNameTopY(WORDMARK_H, clubSize);
  const contentHeight = Math.max(
    WORDMARK_H,
    getClubNameBlockBottomY(WORDMARK_H, lines, clubSize)
  );
  const contentWidth = offsetX + wordmarkW;
  const wordmarkSrc = getRotaryWordmarkDataUrl();
  const showWordmark = isPdfSafeImageSrc(wordmarkSrc);
  const label = (lines[0] || clubName || "Rotary").replace(/\u0000/g, "");

  return (
    <View style={{ padding: clear, width: contentWidth, height: contentHeight }}>
      {showWordmark ? (
        <Image
          src={wordmarkSrc}
          style={{
            position: "absolute",
            top: 0,
            left: offsetX,
            height: WORDMARK_H,
            width: wordmarkW,
          }}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: offsetX,
          top: showWordmark ? clubTop : 0,
          width: columnW,
          alignItems: "flex-end",
        }}
      >
        <Text
          wrap={false}
          style={{
            fontFamily: "Helvetica",
            fontSize: clubSize,
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