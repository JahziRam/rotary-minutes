import { prisma } from "@/lib/prisma";

export async function getPublishedCaseStudies() {
  return prisma.caseStudy.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      titleFr: true,
      titleEn: true,
      summaryFr: true,
      summaryEn: true,
      clubName: true,
      createdAt: true,
    },
  });
}

export async function getCaseStudyBySlug(slug: string) {
  return prisma.caseStudy.findFirst({
    where: { slug, isPublished: true },
  });
}