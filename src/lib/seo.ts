import type { Metadata } from "next";
import { getAppBaseUrl } from "@/lib/app-url";
import { locales, type Locale } from "@/i18n/config";

import { DEFAULT_APP_NAME } from "@/lib/app-settings";

export function getSeoBaseUrl(): string {
  return getAppBaseUrl();
}

export function buildPageMetadata(opts: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  siteName?: string;
}): Metadata {
  const siteName = opts.siteName ?? DEFAULT_APP_NAME;
  const base = getSeoBaseUrl();
  const path = opts.path ?? "";
  const normalizedPath = path.startsWith("/") ? path : path ? `/${path}` : "";
  const url = `${base}/${opts.locale}${normalizedPath}`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${base}/${loc}${normalizedPath}`;
  }

  return {
    title: opts.title,
    description: opts.description,
    metadataBase: new URL(base),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      locale: opts.locale === "fr" ? "fr_FR" : opts.locale === "es" ? "es_ES" : "en_US",
      url,
      siteName,
      title: opts.title,
      description: opts.description,
      images: [
        {
          url: `${base}/${opts.locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: opts.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [`${base}/${opts.locale}/opengraph-image`],
    },
  };
}

export const PUBLIC_SITEMAP_PATHS = [
  "",
  "/demo",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/status",
  "/help",
  "/case-studies",
] as const;