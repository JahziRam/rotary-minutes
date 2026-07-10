import { ImageResponse } from "next/og";
import { getAppBranding } from "@/lib/app-settings";
import { splitAppBrandName } from "@/lib/app-branding-shared";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { appName, tagline: appTagline } = await getAppBranding();
  const { lead, accent } = splitAppBrandName(appName);
  const tagline =
    appTagline ??
    (locale === "fr"
      ? "Procès-verbaux modernes pour clubs Rotary"
      : locale === "es"
        ? "Actas modernas para clubes Rotary"
        : "Modern meeting minutes for Rotary clubs");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #0d2d52 0%, #071a30 60%, #041018 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            height: 6,
            width: 120,
            background: "linear-gradient(90deg, #f5a623, #ffc857)",
            borderRadius: 4,
            marginBottom: 40,
          }}
        />
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
          {accent ? (
            <>
              {lead} <span style={{ color: "#f5a623" }}>{accent}</span>
            </>
          ) : (
            lead
          )}
        </div>
        <div style={{ fontSize: 28, marginTop: 20, color: "rgba(255,255,255,0.8)", maxWidth: 800 }}>
          {tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}