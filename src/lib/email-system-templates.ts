import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

type TemplateDb = Pick<PrismaClient, "emailTemplate">;

export interface SystemEmailTemplate {
  slug: string;
  name: { fr: string; en: string };
  subject: { fr: string; en: string };
  body: { fr: string; en: string };
}

export const SYSTEM_EMAIL_TEMPLATES: SystemEmailTemplate[] = [
  {
    slug: "meeting-reminder",
    name: { fr: "Rappel de réunion", en: "Meeting reminder" },
    subject: {
      fr: "Convocation — {{clubName}} — {{meetingDate}}",
      en: "Meeting invitation — {{clubName}} — {{meetingDate}}",
    },
    body: {
      fr: `<p>Bonjour {{memberName}},</p>
<p>Vous êtes convié(e) à la prochaine réunion du <strong>{{clubName}}</strong>.</p>
<ul>
  <li><strong>Date :</strong> {{meetingDate}}</li>
  <li><strong>Lieu :</strong> {{meetingLocation}}</li>
</ul>
<p>À très bientôt,<br/>L'équipe {{clubName}}</p>`,
      en: `<p>Hello {{memberName}},</p>
<p>You are invited to the next meeting of <strong>{{clubName}}</strong>.</p>
<ul>
  <li><strong>Date:</strong> {{meetingDate}}</li>
  <li><strong>Location:</strong> {{meetingLocation}}</li>
</ul>
<p>See you soon,<br/>The {{clubName}} team</p>`,
    },
  },
  {
    slug: "welcome-member",
    name: { fr: "Bienvenue nouveau membre", en: "Welcome new member" },
    subject: {
      fr: "Bienvenue au {{clubName}}",
      en: "Welcome to {{clubName}}",
    },
    body: {
      fr: `<p>Bonjour {{firstName}},</p>
<p>Nous sommes ravis de vous accueillir au sein du <strong>{{clubName}}</strong>.</p>
<p><a href="{{dashboardUrl}}">Accéder à l'espace club</a></p>`,
      en: `<p>Hello {{firstName}},</p>
<p>We are delighted to welcome you to <strong>{{clubName}}</strong>.</p>
<p><a href="{{dashboardUrl}}">Access the club portal</a></p>`,
    },
  },
  {
    slug: "dues-reminder",
    name: { fr: "Rappel de cotisation", en: "Dues reminder" },
    subject: {
      fr: "Rappel cotisation — {{clubName}}",
      en: "Dues reminder — {{clubName}}",
    },
    body: {
      fr: `<p>Bonjour {{memberName}},</p>
<p>Ceci est un rappel concernant votre cotisation au <strong>{{clubName}}</strong>.</p>
<p>Merci de régulariser votre situation auprès du Trésorier.</p>`,
      en: `<p>Hello {{memberName}},</p>
<p>This is a reminder about your dues for <strong>{{clubName}}</strong>.</p>
<p>Please contact the Treasurer to settle your membership fees.</p>`,
    },
  },
  {
    slug: "birthday",
    name: { fr: "Anniversaire", en: "Birthday" },
    subject: {
      fr: "Joyeux anniversaire {{firstName}} !",
      en: "Happy birthday {{firstName}}!",
    },
    body: {
      fr: `<p>Chère/Cher {{firstName}},</p>
<p>Toute l'équipe du <strong>{{clubName}}</strong> vous souhaite un très joyeux anniversaire !</p>`,
      en: `<p>Dear {{firstName}},</p>
<p>Everyone at <strong>{{clubName}}</strong> wishes you a very happy birthday!</p>`,
    },
  },
  {
    slug: "minute-published",
    name: { fr: "PV finalisé", en: "Minute finalized" },
    subject: {
      fr: "PV finalisé — {{minuteTitle}}",
      en: "Minute finalized — {{minuteTitle}}",
    },
    body: {
      fr: `<p>Bonjour,</p>
<p>Le procès-verbal <strong>{{minuteTitle}}</strong> du club <strong>{{clubName}}</strong> a été finalisé.</p>
<p><a href="{{verifyUrl}}">Vérifier l'authenticité du PV</a></p>`,
      en: `<p>Hello,</p>
<p>The minute <strong>{{minuteTitle}}</strong> for <strong>{{clubName}}</strong> has been finalized.</p>
<p><a href="{{verifyUrl}}">Verify minute authenticity</a></p>`,
    },
  },
];

export async function ensureEmailSystemTemplates(db: TemplateDb = prisma) {
  for (const tpl of SYSTEM_EMAIL_TEMPLATES) {
    for (const lang of ["fr", "en"] as const) {
      const slug = `${tpl.slug}-${lang}`;
      const existing = await db.emailTemplate.findFirst({
        where: { slug, clubId: null, isSystem: true },
      });
      if (existing) {
        await db.emailTemplate.update({
          where: { id: existing.id },
          data: {
            name: tpl.name[lang],
            subject: tpl.subject[lang],
            body: tpl.body[lang],
          },
        });
      } else {
        await db.emailTemplate.create({
          data: {
            slug,
            name: tpl.name[lang],
            subject: tpl.subject[lang],
            body: tpl.body[lang],
            isSystem: true,
            clubId: null,
          },
        });
      }
    }
  }
}