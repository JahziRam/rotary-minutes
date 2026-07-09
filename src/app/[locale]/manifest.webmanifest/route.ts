import { NextResponse } from "next/server";
import { locales } from "@/i18n/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const safeLocale = locales.includes(locale as (typeof locales)[number]) ? locale : "fr";

  const manifest = {
    name: "Rotary Minutes — Gestion de club",
    short_name: "Rotary Minutes",
    description:
      "Gestion complète de club Rotary : membres, réunions, cotisations, PV authentifiés et communications.",
    start_url: `/${safeLocale}/dashboard`,
    display: "standalone",
    background_color: "#071a30",
    theme_color: "#0d2d52",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: safeLocale === "es" ? "Calendario" : safeLocale === "en" ? "Calendar" : "Calendrier",
        short_name: safeLocale === "es" ? "Calendario" : safeLocale === "en" ? "Calendar" : "Calendrier",
        url: `/${safeLocale}/calendar`,
        description:
          safeLocale === "es"
            ? "Ver el calendario del club"
            : safeLocale === "en"
              ? "View club calendar"
              : "Voir le calendrier du club",
      },
      {
        name: safeLocale === "es" ? "Actas" : safeLocale === "en" ? "Minutes" : "Procès-verbaux",
        short_name: safeLocale === "es" ? "Actas" : safeLocale === "en" ? "Minutes" : "PV",
        url: `/${safeLocale}/minutes`,
        description:
          safeLocale === "es"
            ? "Redactar y publicar actas"
            : safeLocale === "en"
              ? "Write and publish minutes"
              : "Rédiger et publier les PV",
      },
      {
        name: safeLocale === "es" ? "Mi cuenta" : safeLocale === "en" ? "My account" : "Mon compte",
        short_name: safeLocale === "es" ? "Cuenta" : safeLocale === "en" ? "Account" : "Compte",
        url: `/${safeLocale}/my-account`,
      },
      {
        name: safeLocale === "es" ? "Cuotas" : safeLocale === "en" ? "Dues" : "Cotisations",
        short_name: safeLocale === "es" ? "Cuotas" : safeLocale === "en" ? "Dues" : "Cotisations",
        url: `/${safeLocale}/members/dues`,
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}