import type { MetadataRoute } from "next";
import { getSeoBaseUrl, PUBLIC_SITEMAP_PATHS } from "@/lib/seo";
import { locales } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSeoBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    PUBLIC_SITEMAP_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/register" || path === "/demo" ? 0.9 : 0.6,
    }))
  );

  let caseStudies: MetadataRoute.Sitemap = [];
  try {
    const studies = await prisma.caseStudy.findMany({
      where: { isPublished: true },
      select: { slug: true, createdAt: true },
    });
    caseStudies = locales.flatMap((locale) =>
      studies.map((study) => ({
        url: `${base}/${locale}/case-studies/${study.slug}`,
        lastModified: study.createdAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }))
    );
  } catch {
    // DB may be unavailable at build time
  }

  return [...staticEntries, ...caseStudies];
}