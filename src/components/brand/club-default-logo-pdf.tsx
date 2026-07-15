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

  return (
    <View style={{ padding: clear, width: contentWidth, height: contentHeight }}>
      <Image
        src={getRotaryWordmarkDataUrl()}
        style={{
          position: "absolute",
          top: 0,
          left: offsetX,
          height: WORDMARK_H,
          width: wordmarkW,
          objectFit: "contain",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: offsetX,
          top: clubTop,
          width: columnW,
          alignItems: "flex-end",
        }}
      >
        <Text
          wrap={false}
          style={{
            fontFamily: "Helvetica",
            fontSize: clubSize,
            fontWeight: "normal",
            color: ROTARY_BRAND.royalBlue,
            textAlign: "right",
          }}
        >
          {lines[0]}
        </Text>
      </View>
    </View>
  );
}