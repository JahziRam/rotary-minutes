import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
const outPath = path.join(desktop, "Guide-Assistant-IA-PV-Rotary-Minutes.pdf");

const doc = new PDFDocument({ margin: 50, size: "A4" });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const purple = "#581c87";
const gray = "#505050";
const lightGray = "#787878";

function title(text) {
  doc.moveDown(0.6).font("Helvetica-Bold").fontSize(14).fillColor("#1e1e1e").text(text);
  doc.moveDown(0.2);
}

function subtitle(text) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#373737").text(text);
  doc.moveDown(0.15);
}

function body(text) {
  doc.font("Helvetica").fontSize(10).fillColor(gray).text(text, { lineGap: 2 });
  doc.moveDown(0.2);
}

function bullet(text) {
  doc.font("Helvetica").fontSize(10).fillColor(gray).text(`  • ${text}`, { lineGap: 2 });
}

function codeBlock(text) {
  const y = doc.y;
  const h = text.split("\n").length * 14 + 12;
  doc.rect(50, y, 495, h).fill("#f5f5fa");
  doc.fillColor("#1e1e1e").font("Courier").fontSize(9);
  doc.text(text, 58, y + 6, { lineGap: 3 });
  doc.moveDown(0.4);
}

doc.font("Helvetica-Bold").fontSize(20).fillColor(purple).text("Assistant IA — Rédaction des PV");
doc.moveDown(0.3);
doc.font("Helvetica").fontSize(11).fillColor(lightGray).text(
  "Guide pas à pas pour activer et utiliser la reformulation IA des procès-verbaux dans Rotary Minutes (Club Minutes).",
  { lineGap: 3 }
);

title("1. Vue d'ensemble");
body(
  "L'assistant IA transforme des notes brutes saisies pendant une réunion en phrases structurées de PV : description, décisions, actions, responsable et échéance. Trois niveaux de configuration doivent être satisfaits."
);
bullet("Niveau serveur : clé API xAI (XAI_API_KEY)");
bullet("Niveau plateforme : activation globale + quota (super admin)");
bullet("Niveau club : module MINUTE_AI ou toggle super admin");

title("2. Prérequis techniques");
subtitle("2.1 Obtenir une clé API xAI");
body("1. Créez un compte sur https://console.x.ai");
body("2. Générez une clé API (format xai-...)");
body("3. Ne l'exposez jamais côté navigateur — uniquement sur le serveur");

subtitle("2.2 Variables d'environnement");
body("Ajoutez sur votre hébergeur (Render, VPS, etc.) ou dans .env en local :");
codeBlock("XAI_API_KEY=xai-votre-cle-api\n# Optionnel :\nXAI_MINUTE_AI_MODEL=grok-3-mini");
body("Redémarrez l'application après modification.");

subtitle("2.3 Migration base de données");
body("En production :");
codeBlock("npx prisma migrate deploy\nnpx prisma generate");
body("Migration : 20260715170000_minute_ai_assist (AddonKey.MINUTE_AI + minuteAiAssistEnabled)");

title("3. Configuration plateforme (super admin)");
body("Admin → Paramètres — section « Assistant IA — rédaction PV »");
bullet("Badge « Clé API détectée » requis");
bullet("Cocher « Activer l'assistant IA sur la plateforme »");
bullet("Quota mensuel par club : 50 par défaut (1 à 500)");
bullet("Modèle xAI : grok-3-mini par défaut");
bullet("Enregistrer");

title("4. Activer pour un club");
subtitle("Option A — Module complémentaire (club)");
body("Paramètres → Abonnement → Modules complémentaires");
body("Activer « Assistant IA — rédaction PV » (MINUTE_AI, 12 €/mois)");

subtitle("Option B — Attribution manuelle (super admin)");
body("Admin → Clubs → club → Fonctionnalités");
bullet("Activer « Assistant IA rédaction PV »");
bullet("Ou attribuer l'addon depuis Admin → Abonnements");

title("5. Utilisation par le secrétaire");
body("1. Ouvrir un PV : Réunions → PV → Modifier");
body("2. Saisir des notes brutes par point d'ODJ");
body("3. Cliquer « Reformuler avec l'IA »");
body("4. Relire et corriger avant validation");
body("Permissions : minutes.view (statut), minutes.edit (reformuler). PV finalisé/archivé = bloqué.");

title("6. Quotas et suivi");
bullet("1 reformulation = 1 unité du quota mensuel du club");
bullet("Compteur visible dans l'éditeur");
bullet("Super admin : quota illimité");
bullet("Audit : MINUTE_AI_POLISH");

title("7. Dépannage");
bullet("Service IA non configuré → ajouter XAI_API_KEY et redémarrer");
bullet("Désactivé par la plateforme → Admin → Paramètres → activer globalement");
bullet("Module non activé → activer MINUTE_AI ou toggle club");
bullet("Quota atteint → attendre le mois suivant ou augmenter le quota");
bullet("Service indisponible → réessayer (erreur réseau xAI)");
bullet("Notes vides → remplir le champ brouillon avant reformulation");

title("8. Checklist de mise en service");
bullet("[ ] XAI_API_KEY configurée");
bullet("[ ] Migration Prisma déployée");
bullet("[ ] Assistant activé (Admin → Paramètres)");
bullet("[ ] Module ou toggle activé pour le club test");
bullet("[ ] Test reformulation sur un PV brouillon");
bullet("[ ] Vérifier audit MINUTE_AI_POLISH");

doc.moveDown(1);
doc.font("Helvetica-Oblique").fontSize(9).fillColor(lightGray).text(
  "Document généré pour Rotary Minutes — Juillet 2026. Référence : CHANGELOG.md, src/lib/minute-ai-config.ts",
  { lineGap: 2 }
);

doc.end();

stream.on("finish", () => {
  console.log(`PDF créé : ${outPath}`);
});