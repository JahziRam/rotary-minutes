import "dotenv/config";
import { polishAgendaItemNotes } from "../src/lib/minute-ai.ts";

function applyPolishedByIndex(items, index, polished) {
  return items.map((row, rowIndex) =>
    rowIndex === index
      ? {
          ...row,
          description: polished.description,
          decisions: polished.decisions || row.decisions,
          actions: polished.actions || row.actions,
          responsible: polished.responsible || row.responsible,
          dueDate: polished.dueDate || row.dueDate,
        }
      : row
  );
}

function applyPolishedById(items, staleId, polished) {
  return items.map((row) =>
    row.id === staleId
      ? {
          ...row,
          description: polished.description,
          decisions: polished.decisions || row.decisions,
          actions: polished.actions || row.actions,
          responsible: polished.responsible || row.responsible,
          dueDate: polished.dueDate || row.dueDate,
        }
      : row
  );
}

const polished = {
  description: "Le budget 2026 a ete adopte a l'unanimite.",
  decisions: "Budget adopte.",
  actions: "Envoi au district.",
  responsible: "Marie",
  dueDate: "2026-03-01",
};

const beforeSave = [
  {
    id: "1730000000000",
    title: "Budget 2026",
    description: "vote budget ok",
    decisions: "",
    actions: "",
    responsible: "",
    dueDate: "",
  },
];

const afterSave = [{ ...beforeSave[0], id: "clxyz_saved_id_from_db" }];

console.log("=== 1. Simulation correctif UI ===");
const broken = applyPolishedById(afterSave, "1730000000000", polished);
const fixed = applyPolishedByIndex(afterSave, 0, polished);

console.log(
  broken[0].description === "vote budget ok"
    ? "OK  Ancien bug reproduit (texte inchange apres reformulation)"
    : "??  Ancien comportement inattendu"
);
console.log(
  fixed[0].description === polished.description
    ? "OK  Correctif index (texte mis a jour)"
    : "ECHEC Correctif index"
);

console.log("\n=== 2. API Bazaarlink / OpenAI ===");
const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.error("ECHEC OPENAI_API_KEY manquante dans .env");
  process.exit(1);
}

const notes = await polishAgendaItemNotes(
  {
    locale: "fr",
    meetingType: "REGULAR",
    agendaTitle: "Approbation du budget 2026",
    rawNotes:
      "vote budget ok a l'unanimite, marie envoie doc au district avant mars",
  },
  process.env.OPENAI_MINUTE_AI_MODEL?.trim() || "gpt-4o-mini",
  apiKey,
  "openai"
);

console.log("OK  Reformulation API");
console.log(JSON.stringify(notes, null, 2));

console.log("\n=== 3. Test navigateur (manuel) ===");
console.log("1. npm run dev");
console.log("2. Admin > Parametres > Fournisseur OpenAI + modele gpt-4o-mini");
console.log("3. Ouvrir un PV en edition, remplir titre + notes, cliquer Reformuler");
console.log("4. Verifier: bouton affiche Reformulation... puis le texte change");