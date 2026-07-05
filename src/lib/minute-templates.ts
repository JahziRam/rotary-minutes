import { prisma } from "@/lib/prisma";
import type { Language, MeetingType, PrismaClient } from "@/generated/prisma/client";

export interface TemplateAgendaItem {
  title: string;
  description?: string;
  status?: string;
}

type TemplateDb = Pick<PrismaClient, "minuteTemplate">;

const SYSTEM_TEMPLATES: Record<
  MeetingType,
  { fr: TemplateAgendaItem[]; en: TemplateAgendaItem[] }
> = {
  STATUTORY: {
    fr: [
      { title: "Ouverture de la séance", status: "OPEN" },
      { title: "Mot du Président", status: "OPEN" },
      { title: "Approbation du PV précédent", status: "OPEN" },
      { title: "Communications", status: "OPEN" },
      { title: "Conférence / Intervenant", status: "OPEN" },
      { title: "Affaires diverses", status: "OPEN" },
      { title: "Clôture de la séance", status: "OPEN" },
    ],
    en: [
      { title: "Opening of the meeting", status: "OPEN" },
      { title: "President's remarks", status: "OPEN" },
      { title: "Approval of previous minutes", status: "OPEN" },
      { title: "Communications", status: "OPEN" },
      { title: "Speaker / Program", status: "OPEN" },
      { title: "Any other business", status: "OPEN" },
      { title: "Closing of the meeting", status: "OPEN" },
    ],
  },
  GENERAL_ASSEMBLY: {
    fr: [
      { title: "Ouverture de l'Assemblée Générale", status: "OPEN" },
      { title: "Rapport du Président", status: "OPEN" },
      { title: "Rapport du Secrétaire", status: "OPEN" },
      { title: "Rapport du Trésorier", status: "OPEN" },
      { title: "Élections", status: "OPEN" },
      { title: "Votes et résolutions", status: "OPEN" },
      { title: "Clôture", status: "OPEN" },
    ],
    en: [
      { title: "Opening of the General Assembly", status: "OPEN" },
      { title: "President's report", status: "OPEN" },
      { title: "Secretary's report", status: "OPEN" },
      { title: "Treasurer's report", status: "OPEN" },
      { title: "Elections", status: "OPEN" },
      { title: "Votes and resolutions", status: "OPEN" },
      { title: "Closing", status: "OPEN" },
    ],
  },
  COMMISSION: {
    fr: [
      { title: "Ouverture de la commission", status: "OPEN" },
      { title: "Ordre du jour", status: "OPEN" },
      { title: "Points à traiter", status: "OPEN" },
      { title: "Décisions et actions", status: "OPEN" },
      { title: "Prochaine réunion", status: "OPEN" },
    ],
    en: [
      { title: "Commission opening", status: "OPEN" },
      { title: "Agenda", status: "OPEN" },
      { title: "Items to discuss", status: "OPEN" },
      { title: "Decisions and actions", status: "OPEN" },
      { title: "Next meeting", status: "OPEN" },
    ],
  },
  COMMITTEE: {
    fr: [
      { title: "Ouverture du comité", status: "OPEN" },
      { title: "Suivi des actions en cours", status: "OPEN" },
      { title: "Nouveaux points", status: "OPEN" },
      { title: "Clôture", status: "OPEN" },
    ],
    en: [
      { title: "Committee opening", status: "OPEN" },
      { title: "Follow-up on actions", status: "OPEN" },
      { title: "New items", status: "OPEN" },
      { title: "Closing", status: "OPEN" },
    ],
  },
  GOVERNOR_VISIT: {
    fr: [
      { title: "Accueil du Gouverneur", status: "OPEN" },
      { title: "Mot du Gouverneur", status: "OPEN" },
      { title: "Présentation du club", status: "OPEN" },
      { title: "Questions et échanges", status: "OPEN" },
      { title: "Clôture", status: "OPEN" },
    ],
    en: [
      { title: "Governor's welcome", status: "OPEN" },
      { title: "Governor's address", status: "OPEN" },
      { title: "Club presentation", status: "OPEN" },
      { title: "Q&A", status: "OPEN" },
      { title: "Closing", status: "OPEN" },
    ],
  },
  JOINT_MEETING: {
    fr: [
      { title: "Ouverture — réunion commune", status: "OPEN" },
      { title: "Présentation des clubs participants", status: "OPEN" },
      { title: "Ordre du jour commun", status: "OPEN" },
      { title: "Clôture", status: "OPEN" },
    ],
    en: [
      { title: "Joint meeting opening", status: "OPEN" },
      { title: "Participating clubs", status: "OPEN" },
      { title: "Joint agenda", status: "OPEN" },
      { title: "Closing", status: "OPEN" },
    ],
  },
  TRAINING: {
    fr: [
      { title: "Introduction", status: "OPEN" },
      { title: "Formation", status: "OPEN" },
      { title: "Exercices pratiques", status: "OPEN" },
      { title: "Synthèse et clôture", status: "OPEN" },
    ],
    en: [
      { title: "Introduction", status: "OPEN" },
      { title: "Training session", status: "OPEN" },
      { title: "Practical exercises", status: "OPEN" },
      { title: "Summary and closing", status: "OPEN" },
    ],
  },
  SPECIAL: {
    fr: [
      { title: "Ouverture", status: "OPEN" },
      { title: "Ordre du jour spécial", status: "OPEN" },
      { title: "Clôture", status: "OPEN" },
    ],
    en: [
      { title: "Opening", status: "OPEN" },
      { title: "Special agenda", status: "OPEN" },
      { title: "Closing", status: "OPEN" },
    ],
  },
};

export async function ensureMinuteTemplates(db: TemplateDb = prisma) {
  const types = Object.keys(SYSTEM_TEMPLATES) as MeetingType[];
  for (const meetingType of types) {
    for (const locale of ["FR", "EN"] as Language[]) {
      const lang = locale === "FR" ? "fr" : "en";
      const items = SYSTEM_TEMPLATES[meetingType][lang];
      const name = `default-${meetingType}-${lang}`;
      const existing = await db.minuteTemplate.findFirst({
        where: { meetingType, locale, clubId: null, isSystem: true, name },
      });
      if (existing) {
        await db.minuteTemplate.update({ where: { id: existing.id }, data: { items: items as object } });
      } else {
        await db.minuteTemplate.create({
          data: { meetingType, locale, name, isSystem: true, items: items as object },
        });
      }
    }
  }
}

export async function getAgendaTemplateForMeeting(
  meetingType: MeetingType,
  locale: string,
  clubId?: string
): Promise<TemplateAgendaItem[]> {
  await ensureMinuteTemplates();
  const lang = locale === "en" ? "EN" : "FR";
  const fallbackLang = lang === "FR" ? "EN" : "FR";

  const custom = clubId
    ? await prisma.minuteTemplate.findFirst({
        where: { meetingType, locale: lang, clubId, isSystem: false },
        orderBy: { sortOrder: "asc" },
      })
    : null;

  if (custom) return custom.items as unknown as TemplateAgendaItem[];

  const system =
    (await prisma.minuteTemplate.findFirst({
      where: { meetingType, locale: lang, clubId: null, isSystem: true },
    })) ??
    (await prisma.minuteTemplate.findFirst({
      where: { meetingType, locale: fallbackLang, clubId: null, isSystem: true },
    }));

  if (system) return system.items as unknown as TemplateAgendaItem[];

  const langKey = locale === "en" ? "en" : "fr";
  return SYSTEM_TEMPLATES[meetingType]?.[langKey] ?? SYSTEM_TEMPLATES.STATUTORY[langKey];
}