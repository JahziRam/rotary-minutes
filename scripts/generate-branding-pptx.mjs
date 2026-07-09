/**
 * Generate Rotary Minutes pitch deck + club presentation
 * Run: node scripts/generate-branding-pptx.mjs <outputDir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || path.join(__dirname, "..", "branding-output");

const NAVY = "0D2D52";
const NAVY_LIGHT = "1A365D";
const GOLD = "F5A623";
const WHITE = "FFFFFF";
const GRAY = "64748B";
const LIGHT = "F8FAFC";

fs.mkdirSync(outDir, { recursive: true });

function addTitleSlide(pres, title, subtitle, footer) {
  const slide = pres.addSlide();
  slide.background = { color: NAVY };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.08,
    fill: { color: GOLD },
    line: { color: GOLD },
  });
  slide.addText(title, {
    x: 0.6,
    y: 1.6,
    w: 8.8,
    h: 1.4,
    fontSize: 36,
    bold: true,
    color: WHITE,
    fontFace: "Georgia",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 3.1,
      w: 8.8,
      h: 1.2,
      fontSize: 18,
      color: "CADCFC",
      fontFace: "Calibri",
    });
  }
  if (footer) {
    slide.addText(footer, {
      x: 0.6,
      y: 5.0,
      w: 8.8,
      h: 0.4,
      fontSize: 11,
      color: GRAY,
      fontFace: "Calibri",
    });
  }
  return slide;
}

function addContentSlide(pres, title, bullets, opts = {}) {
  const slide = pres.addSlide();
  slide.background = { color: opts.dark ? NAVY : LIGHT };
  const titleColor = opts.dark ? WHITE : NAVY;
  const bodyColor = opts.dark ? "E2E8F0" : "334155";

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 0.12,
    h: 5.625,
    fill: { color: GOLD },
    line: { color: GOLD },
  });

  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9.2,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: titleColor,
    fontFace: "Georgia",
  });

  const items = bullets.map((t, i) => ({
    text: t,
    options: { bullet: true, breakLine: i < bullets.length - 1, color: bodyColor, fontSize: 16 },
  }));

  slide.addText(items, {
    x: 0.55,
    y: 1.25,
    w: 8.8,
    h: 4.0,
    fontFace: "Calibri",
    valign: "top",
  });

  if (opts.stat) {
    slide.addText(opts.stat, {
      x: 6.8,
      y: 1.5,
      w: 2.8,
      h: 2.5,
      fontSize: 54,
      bold: true,
      color: GOLD,
      align: "center",
      fontFace: "Georgia",
    });
    slide.addText(opts.statLabel || "", {
      x: 6.8,
      y: 3.9,
      w: 2.8,
      h: 0.5,
      fontSize: 12,
      color: bodyColor,
      align: "center",
      fontFace: "Calibri",
    });
  }

  return slide;
}

// --- PITCH DECK (15 slides) ---
const pitch = new pptxgen();
pitch.layout = "LAYOUT_16x9";
pitch.author = "Rotary Minutes";
pitch.title = "Rotary Minutes — Pitch Deck";

addTitleSlide(
  pitch,
  "Rotary Minutes",
  "La plateforme administrative des clubs Rotary\nProcès-verbaux · Trésorerie · Gouvernance",
  "clubminutes.api.mg · Service indépendant — non affilié à Rotary International · 2026"
);

addContentSlide(pitch, "46 000 clubs. Aucun outil dédié.", [
  "~46 000 clubs Rotary dans le monde",
  "~9 000 clubs en Afrique francophone + Europe francophone (SAM)",
  "3 à 8 heures/mois d'administratif par secrétaire/trésorier",
  "PV dans Word, cotisations dans Excel, validation par email",
  "Aucune solution verticale Rotary, abordable et bilingue FR/EN",
]);

addContentSlide(pitch, "Ce que vivent vos secrétaires", [
  "Rédaction de PV après la réunion, souvent tard le soir",
  "Suivi manuel des cotisations — retards et relances oubliées",
  "Rapports trésorier laborieux sur tableur",
  "Président sans visibilité temps réel",
  "Connectivité variable — besoin mobile et hors ligne",
], { stat: "3h", statLabel: "par réunion perdues" });

addContentSlide(pitch, "Notre solution", [
  "SaaS tout-en-un : réunion live → PV authentifié → cotisations → trésorerie",
  "Verticalisation Rotary : mandats, rôles, workflow PV statutaire",
  "Prix par club, pas par utilisateur — accessible aux petits clubs",
  "Bilingue FR/EN natif",
  "Essai gratuit 14 jours, sans carte bancaire",
  "Déjà déployé en production sur clubminutes.api.mg",
], { dark: true });

addContentSlide(pitch, "PV & réunions — rédigez pendant la séance", [
  "Mode réunion live avec présences auto-remplies",
  "Modèles d'ordre du jour par type de réunion",
  "Circuit validation président avant finalisation",
  "PDF authentifié par QR code (SHA-256)",
  "Décisions transformées en actions avec rappels",
], { stat: "5 min", statLabel: "pour finaliser un PV" });

addContentSlide(pitch, "Finances club intégrées", [
  "Suivi des cotisations par membre (payé, en retard, dispensé)",
  "Trésorerie : recettes, dépenses, graphiques, rapport PDF",
  "Rappels email automatiques",
  "Export CSV/OFX comptable",
  "Module activé dès l'offre Professional (39 €/mois)",
]);

addContentSlide(pitch, "Vue district & gouvernance", [
  "Tableau de bord gouverneur en lecture seule",
  "Benchmark club vs moyenne district",
  "Bibliothèque de PV finalisés",
  "API & intégrations (offre Enterprise)",
  "PWA hors ligne pour zones à connectivité limitée",
], { dark: true });

addContentSlide(pitch, "Marché adressable", [
  "TAM : ~46 000 clubs × ~39 €/mois ≈ 21 M€ ARR théorique",
  "SAM : ~10 000 clubs francophones ≈ 4,7 M€ ARR",
  "SOM An 3 : 150–400 clubs payants (hypothèse)",
  "Segments : secrétaires, présidents, trésoriers, gouverneurs",
  "Expansion district = levier multi-clubs",
]);

addContentSlide(pitch, "Concurrence & différenciation", [
  "Word / Excel / email : gratuit mais coûteux en temps",
  "Outils associatifs généralistes : peu adaptés au rituel Rotary",
  "Rotary Club Central (RI) : reporting, pas de workflow PV collaboratif",
  "Notre wedge : PV authentifié + workflow président + trésorerie",
  "Niche B2B2Club : un abonnement par club",
]);

addContentSlide(pitch, "Modèle de revenus", [
  "Starter 19 €/mois — petits clubs (≤ 30 membres)",
  "Professional 39 €/mois — formule populaire, trésorerie incluse",
  "Enterprise 79 €/mois — district, API, offline",
  "Add-ons : Emails 9 €, District 15 €, Stats 7 €",
  "Parrainage : 1 mois offert par club parrainé",
  "Facturation annuelle : −20 %",
], { stat: "35€", statLabel: "ARPU cible/mois" });

addContentSlide(pitch, "Traction & métriques", [
  "[Placeholder] Clubs en essai gratuit : ___",
  "[Placeholder] Clubs payants actifs : ___",
  "[Placeholder] PV finalisés / mois : ___",
  "KPI north star : minute_finalized (GA4)",
  "Trial → paid conversion cible : 25 %",
  "Production live : clubminutes.api.mg",
], { dark: true });

addContentSlide(pitch, "Unit economics (hypothèses)", [
  "ARPU : 35 €/mois (mix Starter/Pro/Enterprise)",
  "CAC : 250 € (acquisition communautaire Rotary)",
  "Churn mensuel cible : 4 %",
  "LTV/CAC cible : > 3×",
  "Marge brute SaaS : ~80 % après infra & Stripe",
]);

addContentSlide(pitch, "Go-to-market — 12 mois", [
  "Q1 : Pilotes district Afrique francophone (3–5 clubs)",
  "Q2 : Témoignages + programme parrainage inter-clubs",
  "Q3 : Expansion Europe francophone + événements PETS",
  "Q4 : Offre Enterprise district + SEO contenu",
  "Canaux : newsletters district, LinkedIn, démos live",
]);

addContentSlide(pitch, "Équipe & partenaires", [
  "[Placeholder] Fondateur / Product & Tech",
  "[Placeholder] Conseil Rotary (secrétaires, gouverneurs)",
  "Stack : Next.js 16, PostgreSQL, Stripe, Render",
  "Partenaires cibles : districts pilotes, hébergeurs locaux",
  "Support bilingue FR/EN",
]);

addTitleSlide(
  pitch,
  "Rejoignez la modernisation des clubs Rotary",
  "Essai gratuit 14 jours · clubminutes.api.mg\nContact : [email fondateur]",
  "Rotary Minutes — Service Above Self, powered by software"
);

const pitchPath = path.join(outDir, "Pitch_Deck_Rotary_Minutes.pptx");
await pitch.writeFile({ fileName: pitchPath });
console.log("Created:", pitchPath);

// --- CLUB PRESENTATION (12 slides) ---
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Rotary Minutes";
pres.title = "Rotary Minutes — Présentation Club";

addTitleSlide(
  pres,
  "Rotary Minutes",
  "Pilotez votre club et diffusez vos PV à temps",
  "Présentation pour secrétaires & présidents · clubminutes.api.mg"
);

addContentSlide(pres, "La réalité administrative de votre club", [
  "PV rédigés dans Word, validés par email",
  "Cotisations suivies dans un tableur partagé",
  "Président sans vue consolidée sur les décisions",
  "Archives dispersées, versions contradictoires",
  "Temps précieux retiré au service et à la fellowship",
]);

addContentSlide(pres, "La solution en une phrase", [
  "Une plateforme collaborative dédiée aux clubs Rotary",
  "Rédigez le PV pendant la réunion",
  "Validez avec le président en un clic",
  "Diffusez un PDF authentifié aux membres",
  "Gérez cotisations et trésorerie au même endroit",
], { dark: true });

addContentSlide(pres, "Procès-verbaux — le cœur du produit", [
  "Mode réunion live : tapez pendant la séance",
  "Modèles d'ordre du jour (statutaire, AG, visite gouverneur…)",
  "Soumission au président → approbation → finalisation",
  "PDF professionnel avec logo club + QR code vérifiable",
  "Archivage versionné et recherche instantanée",
], { stat: "5 min", statLabel: "vs 3 heures" });

addContentSlide(pres, "Trésorerie & cotisations", [
  "Tableau de bord solde, recettes, dépenses",
  "Cotisations par membre : payé, en attente, en retard, dispensé",
  "Factures et reçus par email",
  "Rappels automatiques aux membres",
  "Export CSV/OFX pour votre comptable",
]);

addContentSlide(pres, "Visibilité pour le président", [
  "Dashboard : actions ouvertes, prochaine réunion",
  "Statistiques d'assiduité et de participation",
  "Validation des PV avant diffusion",
  "Commentaires et demandes de corrections",
  "Pilotage du mandat en temps réel",
], { dark: true });

addContentSlide(pres, "Modules inclus selon votre formule", [
  "Calendrier unifié (réunions, échéances, anniversaires)",
  "Actions issues des décisions des PV",
  "Portail membre (cotisations, documents)",
  "Emails brandés au nom du club",
  "Vue district lecture seule pour le gouverneur",
]);

addContentSlide(pres, "Tarifs simples et transparents", [
  "Starter 19 €/mois — jusqu'à 30 membres, PV illimités",
  "Professional 39 €/mois — trésorerie, emails, stats (populaire)",
  "Enterprise 79 €/mois — district, API, offline",
  "Essai gratuit 14 jours — sans carte bancaire",
  "Facturation annuelle : −20 %",
], { stat: "14j", statLabel: "essai gratuit" });

addContentSlide(pres, "Sécurité & conformité", [
  "Multi-tenant isolé : chaque club a son espace",
  "PV finalisés : hash SHA-256 + vérification publique",
  "RGPD : consentement cookies, politique de confidentialité",
  "Hébergement sécurisé (Render, HTTPS)",
  "Données exportables à tout moment",
]);

addContentSlide(pres, "Ce que disent les clubs pilotes", [
  "[Témoignage] « J'ai réduit mon temps PV de 70 % » — Secrétaire",
  "[Témoignage] « Enfin une vue claire sur les cotisations » — Trésorier",
  "[Témoignage] « Je valide les PV depuis mon téléphone » — Président",
  "Rejoignez les clubs qui modernisent sans complexifier",
]);

addContentSlide(pres, "Démarrer en 30 minutes", [
  "1. Créer votre espace club (nom, logo, membres)",
  "2. Configurer votre première réunion",
  "3. Tester le mode live lors de la prochaine séance",
  "4. Finaliser et partager votre premier PV authentifié",
  "Support en français inclus · Bilingue FR/EN",
], { dark: true });

addTitleSlide(
  pres,
  "Essayez gratuitement 14 jours",
  "clubminutes.api.mg/register\nSans carte bancaire · Configuration en 2 minutes",
  "Rotary Minutes — Moins d'administratif, plus d'impact"
);

const presPath = path.join(outDir, "Presentation_Club_Rotary_Minutes.pptx");
await pres.writeFile({ fileName: presPath });
console.log("Created:", presPath);