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
<p>Ceci est un rappel concernant votre cotisation <strong>{{duesAmount}}</strong> pour l'exercice <strong>{{fiscalYear}}</strong> au <strong>{{clubName}}</strong>.</p>
<p>Échéance : <strong>{{duesDueDate}}</strong></p>
<p><a class="cta-button" href="{{dashboardUrl}}">Voir mes cotisations</a></p>`,
      en: `<p>Hello {{memberName}},</p>
<p>This is a reminder about your <strong>{{duesAmount}}</strong> dues for fiscal year <strong>{{fiscalYear}}</strong> at <strong>{{clubName}}</strong>.</p>
<p>Due date: <strong>{{duesDueDate}}</strong></p>
<p><a class="cta-button" href="{{dashboardUrl}}">View my dues</a></p>`,
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
<p>Le PDF officiel est joint à cet email.</p>
<p><a class="cta-button" href="{{loginUrl}}">Se connecter à la plateforme</a></p>
<p style="font-size:14px;color:#64748b">Pensez à consulter régulièrement votre compte pour suivre les projets et actions du club.</p>`,
      en: `<p>Hello,</p>
<p>The minute <strong>{{minuteTitle}}</strong> for <strong>{{clubName}}</strong> has been finalized.</p>
<p>The official PDF is attached to this email.</p>
<p><a class="cta-button" href="{{loginUrl}}">Sign in to the platform</a></p>
<p style="font-size:14px;color:#64748b">Please check your account regularly to follow the club's projects and actions.</p>`,
    },
  },
  {
    slug: "action-deadline-reminder",
    name: { fr: "Rappel échéance action", en: "Action deadline reminder" },
    subject: {
      fr: "Échéance proche — {{actionTitle}}",
      en: "Deadline approaching — {{actionTitle}}",
    },
    body: {
      fr: `<p>Bonjour {{memberName}},</p>
<p>L'action <strong>{{actionTitle}}</strong> du club <strong>{{clubName}}</strong> arrive à échéance le <strong>{{actionDueDate}}</strong>.</p>
<p>Responsable : {{actionResponsible}}</p>
<p><a class="cta-button" href="{{dashboardUrl}}">Voir le tableau de bord</a></p>`,
      en: `<p>Hello {{memberName}},</p>
<p>The action <strong>{{actionTitle}}</strong> for <strong>{{clubName}}</strong> is due on <strong>{{actionDueDate}}</strong>.</p>
<p>Owner: {{actionResponsible}}</p>
<p><a class="cta-button" href="{{dashboardUrl}}">View dashboard</a></p>`,
    },
  },
  {
    slug: "pv-draft-reminder",
    name: { fr: "Rappel PV brouillon", en: "Draft minutes reminder" },
    subject: {
      fr: "PV en attente — {{minuteTitle}}",
      en: "Minutes pending — {{minuteTitle}}",
    },
    body: {
      fr: `<p>Bonjour {{memberName}},</p>
<p>Le procès-verbal <strong>{{minuteTitle}}</strong> est encore en brouillon pour <strong>{{clubName}}</strong>.</p>
<p>Merci de finaliser la rédaction avant la prochaine réunion.</p>
<p><a class="cta-button" href="{{dashboardUrl}}">Ouvrir le PV</a></p>`,
      en: `<p>Hello {{memberName}},</p>
<p>The minutes <strong>{{minuteTitle}}</strong> are still in draft for <strong>{{clubName}}</strong>.</p>
<p>Please complete them before the next meeting.</p>
<p><a class="cta-button" href="{{dashboardUrl}}">Open minutes</a></p>`,
    },
  },
  {
    slug: "meeting-followup",
    name: { fr: "Suivi après réunion", en: "Meeting follow-up" },
    subject: {
      fr: "Suivi réunion — {{clubName}} — {{meetingDate}}",
      en: "Meeting follow-up — {{clubName}} — {{meetingDate}}",
    },
    body: {
      fr: `<p>Bonjour {{memberName}},</p>
<p>Merci pour votre participation à la réunion du <strong>{{meetingDate}}</strong> à <strong>{{meetingLocation}}</strong>.</p>
<p>Le PV sera disponible prochainement. Consultez les actions ouvertes sur le tableau de bord.</p>
<p><a class="cta-button" href="{{dashboardUrl}}">Accéder au club</a></p>`,
      en: `<p>Hello {{memberName}},</p>
<p>Thank you for attending the meeting on <strong>{{meetingDate}}</strong> at <strong>{{meetingLocation}}</strong>.</p>
<p>Minutes will be available soon. Review open actions on the dashboard.</p>
<p><a class="cta-button" href="{{dashboardUrl}}">Go to club portal</a></p>`,
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