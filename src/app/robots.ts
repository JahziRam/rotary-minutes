import type { MetadataRoute } from "next";
import { getSeoBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSeoBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard", "/settings", "/meetings", "/members"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}