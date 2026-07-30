import { Text, View } from "@react-pdf/renderer";
import { resolveClubNameLayout } from "@/lib/club-default-logo";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;
const WORDMARK_H = 38;

/**
 * Repli PDF text-only (pas d'Image wordmark).
 * Le PNG wordmark (~64 Ko) provoquait des TypeError intermittents
 * dans @react-pdf/renderer sur Vercel (lecture 'S').
 */
export function ClubDefaultLogoPdf({ clubName }: { clubName: string }) {
  const { lines, fontSize: clubSize } = resolveClubNameLayout(clubName, WORDMARK_H);
  const label = (lines[0] || clubName || "Rotary").replace(/\u0000/g, "");

  return (
    <View style={{ padding: clear, maxWidth: 220 }}>
      <Text
        wrap={false}
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 13,
          color: ROTARY_BRAND.royalBlue,
          marginBottom: 2,
        }}
      >
        Rotary
      </Text>
      <Text
        wrap={false}
        style={{
          fontFamily: "Helvetica",
          fontSize: Math.max(8, Math.min(clubSize, 11)),
          color: ROTARY_BRAND.royalBlue,
        }}
      >
        {label}
      </Text>
    </View>
  );
}