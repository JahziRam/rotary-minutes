import { prisma } from "@/lib/prisma";

export async function getEmailContacts(clubId: string) {
  return prisma.emailContact.findMany({
    where: { clubId },
    include: { groups: { include: { group: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getEmailGroups(clubId: string) {
  return prisma.emailGroup.findMany({
    where: { clubId },
    include: {
      contacts: { include: { contact: true } },
      _count: { select: { contacts: true, campaigns: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getEmailTemplates(clubId: string, locale: string) {
  const lang = locale === "en" ? "en" : "fr";
  return prisma.emailTemplate.findMany({
    where: {
      OR: [
        { clubId },
        { clubId: null, isSystem: true, slug: { endsWith: `-${lang}` } },
      ],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function getEmailCampaigns(clubId: string) {
  return prisma.emailCampaign.findMany({
    where: { clubId },
    include: {
      group: { select: { name: true } },
      template: { select: { name: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmailHistory(clubId: string, limit = 50) {
  return prisma.emailLog.findMany({
    where: { campaign: { clubId } },
    include: {
      campaign: {
        select: { name: true, subject: true, sentAt: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}