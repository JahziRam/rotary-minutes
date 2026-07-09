import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPgAdapter } from "../src/lib/pg-adapter";
import { generateMinuteHash, getVerifyUrl } from "../src/lib/hash";
import { ensureRoleConfigs } from "../src/lib/roles";
import { ensureClubFeatures } from "../src/lib/features";
import { ensurePlanConfigs } from "../src/lib/plans";
import { ensureAddonConfigs } from "../src/lib/billing";
import { ensureDistrictMinuteTemplates, ensureMinuteTemplates } from "../src/lib/minute-templates";
import { ensureEmailSystemTemplates } from "../src/lib/email-system-templates";
import { ensureDemoSessionHelper } from "../src/lib/queries/demo";
import { ensureFeatureFlags } from "../src/lib/feature-flags";

const SUPER_ADMIN_EMAIL = "superadmin@rotaryminutes.app";
const SUPER_ADMIN_PASSWORD = "RotaryAdmin2026!";

const DEMO_MEMBERS = [
  { firstName: "Jean", lastName: "Dupont", position: "Président", email: "j.dupont@example.fr" },
  { firstName: "Marie", lastName: "Martin", position: "Secrétaire", email: "m.martin@example.fr" },
  { firstName: "Pierre", lastName: "Bernard", position: "Trésorier", email: "p.bernard@example.fr" },
  { firstName: "Sophie", lastName: "Leroy", position: "Membre" },
  { firstName: "Luc", lastName: "Moreau", position: "Membre" },
  { firstName: "Claire", lastName: "Petit", position: "Membre" },
  { firstName: "Antoine", lastName: "Roux", position: "Membre" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: createPgAdapter(connectionString) });

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      passwordHash,
      isSuperAdmin: true,
      firstName: "Super",
      lastName: "Admin",
      emailVerified: new Date(),
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      isSuperAdmin: true,
      emailVerified: new Date(),
      language: "FR",
    },
  });

  const club = await prisma.club.upsert({
    where: { slug: "rotary-club-paris-demo" },
    update: {
      presidentName: "Jean Dupont",
      secretaryName: "Marie Martin",
      memberCount: DEMO_MEMBERS.length,
    },
    create: {
      name: "Rotary Club de Paris (Démo)",
      slug: "rotary-club-paris-demo",
      country: "France",
      city: "Paris",
      district: "1660",
      address: "45 Bd Raspail, 75006 Paris",
      meetingLocation: "Hôtel Lutetia, 45 Bd Raspail",
      meetingDay: "Mardi",
      meetingTime: "12:30",
      presidentName: "Jean Dupont",
      secretaryName: "Marie Martin",
      memberCount: DEMO_MEMBERS.length,
      language: "FR",
    },
  });

  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: club.id, userId: superAdmin.id } },
    update: { role: "ADMIN", isActive: true },
    create: { clubId: club.id, userId: superAdmin.id, role: "ADMIN" },
  });

  await prisma.subscription.upsert({
    where: { clubId: club.id },
    update: { plan: "ENTERPRISE", status: "ACTIVE" },
    create: { clubId: club.id, plan: "ENTERPRISE", status: "ACTIVE" },
  });

  await prisma.districtAccess.upsert({
    where: { userId_district: { userId: superAdmin.id, district: "1660" } },
    update: { canViewPV: true },
    create: { userId: superAdmin.id, district: "1660", canViewPV: true },
  });

  // Seed members
  for (const m of DEMO_MEMBERS) {
    const existing = await prisma.member.findFirst({
      where: { clubId: club.id, firstName: m.firstName, lastName: m.lastName },
    });
    if (!existing) {
      await prisma.member.create({
        data: { clubId: club.id, ...m },
      });
    }
  }

  const members = await prisma.member.findMany({ where: { clubId: club.id } });

  // Seed a past meeting with attendances
  const pastDate = new Date("2026-06-24T12:30:00");
  let pastMeeting = await prisma.meeting.findFirst({
    where: { clubId: club.id, date: pastDate },
  });

  if (!pastMeeting) {
    pastMeeting = await prisma.meeting.create({
      data: {
        clubId: club.id,
        date: pastDate,
        location: club.meetingLocation,
        startTime: "12:30",
        endTime: "14:00",
        presidedBy: "Jean Dupont",
        secretary: "Marie Martin",
        type: "STATUTORY",
        attendances: {
          create: members.map((m, i) => ({
            memberId: m.id,
            category: i < 5 ? "PRESENT" : i < 6 ? "EXCUSED_ABSENT" : "UNEXCUSED_ABSENT",
          })),
        },
      },
    });

    await prisma.minute.create({
      data: {
        clubId: club.id,
        meetingId: pastMeeting.id,
        title: "PV Réunion statutaire — 24 juin 2026",
        status: "FINALIZED",
        authorId: superAdmin.id,
        finalizedAt: new Date(),
        agendaItems: {
          create: [
            { sortOrder: 0, title: "Ouverture de la séance", status: "COMPLETED", description: "La séance est ouverte à 12h35." },
            { sortOrder: 1, title: "Mot du Président", status: "COMPLETED", decisions: "Approbation unanime des objectifs du mandat." },
            { sortOrder: 2, title: "Conférence humanitaire", status: "COMPLETED", actions: "Organiser une collecte en septembre", responsible: "Sophie Leroy" },
          ],
        },
      },
    });
  }

  // Seed upcoming meeting
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  nextDate.setHours(12, 30, 0, 0);

  const existingNext = await prisma.meeting.findFirst({
    where: { clubId: club.id, date: { gte: new Date() } },
  });

  if (!existingNext) {
    const nextMeeting = await prisma.meeting.create({
      data: {
        clubId: club.id,
        date: nextDate,
        location: club.meetingLocation,
        startTime: club.meetingTime,
        presidedBy: club.presidentName,
        secretary: club.secretaryName,
        type: "STATUTORY",
      },
    });

    await prisma.minute.create({
      data: {
        clubId: club.id,
        meetingId: nextMeeting.id,
        title: `PV — ${nextDate.toLocaleDateString("fr-FR")}`,
        status: "DRAFT",
        authorId: superAdmin.id,
        agendaItems: {
          create: { sortOrder: 0, title: "Ouverture de la séance", status: "OPEN" },
        },
      },
    });
  }

  const CONTACT_INBOX_EMAIL = "jahaziela@ramanitra.mg";

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { annualDiscountPercent: 20, currency: "EUR" },
    create: {
      id: "global",
      appName: "Rotary Minutes",
      tagline: "Procès-verbaux modernes pour clubs Rotary",
      supportEmail: SUPER_ADMIN_EMAIL,
      contactToEmail: CONTACT_INBOX_EMAIL,
      contactBccEmail: CONTACT_INBOX_EMAIL,
      trialDays: 14,
      annualDiscountPercent: 20,
      currency: "EUR",
    },
  });

  await ensurePlanConfigs(prisma);
  await ensureAddonConfigs(prisma);
  await ensureFeatureFlags(prisma);

  await prisma.promoCode.upsert({
    where: { code: "WELCOME20" },
    update: { isActive: true },
    create: {
      code: "WELCOME20",
      discountType: "PERCENT",
      discountValue: 20,
      maxUses: 100,
      isActive: true,
    },
  });

  await ensureMinuteTemplates(prisma);
  if (club.district) {
    await ensureDistrictMinuteTemplates(club.district, prisma);
  }
  await ensureEmailSystemTemplates(prisma);
  await ensureRoleConfigs();
  await ensureClubFeatures(club.id);
  await prisma.clubFeatures.update({
    where: { clubId: club.id },
    data: { apiAccessEnabled: true },
  });

  // Demo email contacts & group
  const membersWithEmail = await prisma.member.findMany({
    where: { clubId: club.id, email: { not: null } },
  });
  for (const m of membersWithEmail) {
    if (!m.email) continue;
    await prisma.emailContact.upsert({
      where: { clubId_email: { clubId: club.id, email: m.email } },
      update: { firstName: m.firstName, lastName: m.lastName },
      create: {
        clubId: club.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        tags: ["membre"],
      },
    });
  }
  const allContacts = await prisma.emailContact.findMany({ where: { clubId: club.id } });
  let demoGroup = await prisma.emailGroup.findFirst({
    where: { clubId: club.id, name: "Membres actifs" },
  });
  if (!demoGroup) {
    demoGroup = await prisma.emailGroup.create({
      data: { clubId: club.id, name: "Membres actifs", description: "Tous les membres avec email" },
    });
  }
  for (const c of allContacts) {
    await prisma.emailGroupContact.upsert({
      where: { groupId_contactId: { groupId: demoGroup.id, contactId: c.id } },
      update: {},
      create: { groupId: demoGroup.id, contactId: c.id },
    });
  }

  const finalizedMinute = await prisma.minute.findFirst({
    where: { clubId: club.id, status: "FINALIZED" },
    include: {
      agendaItems: true,
      meeting: { include: { attendances: true } },
    },
  });
  await prisma.caseStudy.upsert({
    where: { slug: "rotary-club-paris-demo" },
    update: { isPublished: true },
    create: {
      slug: "rotary-club-paris-demo",
      titleFr: "Le Rotary Club de Paris modernise ses PV",
      titleEn: "Rotary Club of Paris modernizes its minutes",
      summaryFr:
        "Réduction de 80 % du temps de rédaction des procès-verbaux grâce à Rotary Minutes.",
      summaryEn:
        "80% reduction in minutes writing time with Rotary Minutes.",
      contentFr: `Le Rotary Club de Paris (Démo) utilisait auparavant des documents Word partagés par email. La coordination entre le secrétaire, le président et les membres du bureau était chronophage.

Avec Rotary Minutes, le secrétaire rédige les PV en direct pendant la réunion. L'auto-remplissage des présences et l'ordre du jour type font gagner un temps précieux.

Les PV finalisés sont authentifiés par QR code et archivés dans une bibliothèque consultable. Le président valide en un clic avant diffusion aux membres.`,
      contentEn: `The Rotary Club of Paris (Demo) previously relied on Word documents shared by email. Coordinating between the secretary, president, and board members was time-consuming.

With Rotary Minutes, the secretary drafts minutes live during the meeting. Auto-filled attendance and meeting templates save valuable time.

Finalized minutes are QR-authenticated and archived in a searchable library. The president approves with one click before distribution to members.`,
      clubName: "Rotary Club de Paris",
      isPublished: true,
      sortOrder: 1,
    },
  });

  await prisma.caseStudy.upsert({
    where: { slug: "rotary-lyon-assiduity" },
    update: { isPublished: true },
    create: {
      slug: "rotary-lyon-assiduity",
      titleFr: "Rotary Lyon : assiduité sous contrôle",
      titleEn: "Rotary Lyon: attendance under control",
      summaryFr:
        "Suivi de l'assiduité en temps réel et tableaux de bord pour le bureau.",
      summaryEn:
        "Real-time attendance tracking and dashboards for the board.",
      contentFr: `Le club Rotary de Lyon cherchait un outil pour suivre l'assiduité sans tableurs complexes.

Rotary Minutes centralise les présences à chaque réunion statutaire. Les statistiques annuelles et mensuelles sont calculées automatiquement.

Le président identifie rapidement les membres à accompagner. Le module district permet au gouverneur de comparer les clubs du secteur.`,
      contentEn: `Rotary Club Lyon needed a tool to track attendance without complex spreadsheets.

Rotary Minutes centralizes attendance at every statutory meeting. Annual and monthly statistics are computed automatically.

The president quickly identifies members who need support. The district module lets the governor benchmark clubs across the sector.`,
      clubName: "Rotary Club de Lyon",
      isPublished: true,
      sortOrder: 2,
    },
  });

  await ensureDemoSessionHelper();

  if (finalizedMinute) {
    const hash = generateMinuteHash({
      id: finalizedMinute.id,
      title: finalizedMinute.title,
      agendaItems: finalizedMinute.agendaItems,
      meeting: finalizedMinute.meeting,
      attendances: finalizedMinute.meeting.attendances,
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await prisma.minute.update({
      where: { id: finalizedMinute.id },
      data: {
        contentHash: hash,
        verifyUrl: getVerifyUrl(hash, baseUrl, "fr"),
      },
    });
  }

  console.log("✅ Seed terminé");
  console.log(`   Email    : ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password : ${SUPER_ADMIN_PASSWORD}`);
  console.log(`   Club     : ${club.name}`);
  console.log(`   Membres  : ${members.length}`);
  console.log(`   Réunions : seedées`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});