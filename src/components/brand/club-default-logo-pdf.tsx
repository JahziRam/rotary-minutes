import { Image, Text, View } from "@react-pdf/renderer";
import {
  CLUB_DEFAULT_LOGO,
  getRotaryWordmarkDataUrl,
  resolveClubNameLayout,
} from "@/lib/club-default-logo";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";
import { ROTARY_WORDMARK_ASPECT } from "@/lib/rotary-wordmark-b64";

const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;
const WORDMARK_H = 38;

/** Repli PDF : wordmark Rotary + nom du club sous « Rotary », à gauche de la roue. */
export function ClubDefaultLogoPdf({ clubName }: { clubName: string }) {
  const wordmarkW = WORDMARK_H * ROTARY_WORDMARK_ASPECT;
  const { lines, fontSize: clubSize, maxWidth: clubMaxW } =
    resolveClubNameLayout(clubName, WORDMARK_H);
  const baselineRatio =
    lines.length > 1
      ? CLUB_DEFAULT_LOGO.clubNameBaselineRatio - 0.06
      : CLUB_DEFAULT_LOGO.clubNameBaselineRatio;
  const clubTop = WORDMARK_H * baselineRatio - clubSize * 0.15;

  return (
    <View style={{ padding: clear, width: wordmarkW, height: WORDMARK_H }}>
      <Image
        src={getRotaryWordmarkDataUrl()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: WORDMARK_H,
          width: wordmarkW,
          objectFit: "contain",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          top: clubTop,
          width: clubMaxW,
        }}
      >
        {lines.map((line, i) => (
          <Text
            key={i}
            wrap={false}
            style={{
              fontFamily: "Helvetica",
              fontSize: clubSize,
              fontWeight: "normal",
              color: ROTARY_BRAND.royalBlue,
              marginTop: i === 0 ? 0 : 1,
            }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}